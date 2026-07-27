import type { SummaryData } from "@/lib/types";
import { type Conf, classificaConf, confMenosConfiavel } from "@/lib/risk";
import { scoreSocioambiental, contarAlertasSocio, SOCIO_TOTAL_CAMADAS } from "@/lib/socioambiental";

// ---------------------------------------------------------------------------
// Score Agro — índice 0..100 do potencial do CPF/CNPJ como cliente de crédito.
// Recalculado conforme o NÍVEL DE RISCO FUNDIÁRIO escolhido.
//
// 3 pilares:
//   • Documental (peso 35%)     — aderência fundiária das parcelas do nível de risco
//   • Produção   (peso 45%)     — capacidade de pagamento (quadro do nível de risco)
//   • Socioambiental (peso 20%) — alertas do Panorama Socioambiental do nível de risco
// ---------------------------------------------------------------------------

export const PESOS = { documental: 0.35, producao: 0.45, socioambiental: 0.2 };

// Parâmetros de calibração (documentados na explicação da regra)
export const PARAMS = {
  // Pesos por confiabilidade fundiária da parcela (mesma classificação da tabela)
  tierAlta: 1.0, // alta confiabilidade
  tierMedia: 0.6, // média confiabilidade
  tierBaixa: 0.3, // baixa confiabilidade
  docAderenciaPeso: 0.7,
  docCarPeso: 0.3,
  // Produção
  margemHaTeto: 3500, // R$/ha de margem líquida que representa 100% de eficiência
  prodRentPeso: 0.6,
  prodConsistPeso: 0.4,
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

export interface Detalhe {
  label: string;
  valor: string;
}
export interface Pilar {
  score: number; // 0..100
  peso: number; // 0..1
  detalhes: Detalhe[];
}
export interface ProducaoResumo {
  totais: { area: number; resultado: number };
  por_safra: { safra: string; resultado: number }[];
}
export interface ScoreAgro {
  total: number; // 0..100
  classificacao: { label: string; cor: string };
  documental: Pilar;
  producao: Pilar;
  socioambiental: Pilar;
}

const pct = (x: number) => `${(x * 100).toFixed(0)}%`;

// --- Pilar 1: Documental (dados reais, conforme as confiabilidades selecionadas) ---
// A aderência pondera cada parcela pela sua CONFIABILIDADE FUNDIÁRIA (mesma regra
// da tabela): alta = 1,0 · média = 0,6 · baixa = 0,3.
export function calcDocumental(data: SummaryData, sel: Set<Conf>): Pilar {
  const validOK = sel.has("alta") ? data.valid_details.filter((d) => d.atencao === "OK") : [];
  const validAtencao = sel.has("media") ? data.valid_details.filter((d) => d.atencao !== "OK") : [];
  // Potenciais divididos pela confiabilidade real (mesma regra da tabela)
  const potMedia = sel.has("media")
    ? data.non_valid_geo.filter((d) => classificaConf(d.match_type) === "media")
    : [];
  const potBaixa = sel.has("baixa")
    ? data.non_valid_geo.filter((d) => classificaConf(d.match_type) === "baixa")
    : [];
  const potenciais = [...potMedia, ...potBaixa];

  // Áreas agrupadas por confiabilidade
  const altaArea = sum(validOK.map((d) => d.area_sigef));
  const mediaArea = sum([...validAtencao, ...potMedia].map((d) => d.area_sigef));
  const baixaArea = sum(potBaixa.map((d) => d.area_sigef));
  const totalGeo = altaArea + mediaArea + baixaArea;

  const aderencia =
    totalGeo > 0
      ? (PARAMS.tierAlta * altaArea + PARAMS.tierMedia * mediaArea + PARAMS.tierBaixa * baixaArea) / totalGeo
      : 0;

  const carAtivo = sum(data.car_details.filter((c) => c.status === "Ativos/Pendentes").map((c) => c.total_area));
  const carTotal = sum(data.car_details.map((c) => c.total_area));
  const carReg = carTotal > 0 ? carAtivo / carTotal : 1;

  let score: number;
  if (totalGeo > 0) {
    score = 100 * (PARAMS.docAderenciaPeso * aderencia + PARAMS.docCarPeso * carReg);
  } else {
    score = carTotal > 0 ? 40 * carReg : 0; // sem georreferenciamento válido = alto risco
  }

  return {
    score: Math.round(score),
    peso: PESOS.documental,
    detalhes: [
      { label: "Alta confiabilidade", valor: `${validOK.length}` },
      { label: "Média confiabilidade", valor: `${validAtencao.length + potMedia.length}` },
      { label: "Baixa confiabilidade", valor: `${potBaixa.length}` },
      { label: "Índice de aderência", valor: pct(aderencia) },
      { label: "CAR ativo/pendente", valor: pct(carReg) },
    ],
  };
}

// --- Pilar 2: Produção / capacidade de pagamento (dados reais) ---
export function calcProducao(prod: ProducaoResumo | null): Pilar {
  if (!prod || prod.totais.area <= 0) {
    return {
      score: 0,
      peso: PESOS.producao,
      detalhes: [{ label: "Histórico de produção", valor: "não encontrado" }],
    };
  }
  const margemHa = prod.totais.resultado / prod.totais.area;
  const rentScore = clamp01(margemHa / PARAMS.margemHaTeto);
  const nSafras = prod.por_safra.length;
  const nPos = prod.por_safra.filter((s) => s.resultado > 0).length;
  const consist = nSafras > 0 ? nPos / nSafras : 0;

  const score = 100 * (PARAMS.prodRentPeso * rentScore + PARAMS.prodConsistPeso * consist);

  return {
    score: Math.round(score),
    peso: PESOS.producao,
    detalhes: [
      { label: "Margem líquida / ha", valor: `R$ ${margemHa.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}` },
      { label: "Eficiência (vs R$ 3.500/ha)", valor: pct(rentScore) },
      { label: "Safras positivas", valor: `${nPos}/${nSafras}` },
      { label: "Consistência", valor: pct(consist) },
    ],
  };
}

// --- Pilar 3: Socioambiental (Panorama Socioambiental da seleção) ---
export function calcSocioambiental(sel: Set<Conf>): Pilar {
  const conf = confMenosConfiavel(sel);
  const alertas = contarAlertasSocio(conf);
  const score = scoreSocioambiental(conf);
  return {
    score,
    peso: PESOS.socioambiental,
    detalhes: [
      { label: "Camadas com alerta", valor: `${alertas} de ${SOCIO_TOTAL_CAMADAS}` },
      { label: "Camadas conformes", valor: `${SOCIO_TOTAL_CAMADAS - alertas} de ${SOCIO_TOTAL_CAMADAS}` },
    ],
  };
}

export function classificar(total: number): { label: string; cor: string } {
  if (total >= 80) return { label: "Ótimo", cor: "#10b981" };
  if (total >= 60) return { label: "Bom", cor: "#22c55e" };
  if (total >= 40) return { label: "Regular", cor: "#f59e0b" };
  if (total >= 20) return { label: "Baixo", cor: "#f97316" };
  return { label: "Crítico", cor: "#ef4444" };
}

export function calcScoreAgro(data: SummaryData, prod: ProducaoResumo | null, sel: Set<Conf>): ScoreAgro {
  const documental = calcDocumental(data, sel);
  const producao = calcProducao(prod);
  const socioambiental = calcSocioambiental(sel);
  const total = Math.round(
    documental.score * PESOS.documental +
      producao.score * PESOS.producao +
      socioambiental.score * PESOS.socioambiental
  );
  return { total, classificacao: classificar(total), documental, producao, socioambiental };
}
