import type { SummaryData } from "@/lib/types";
import type { RiskLevel } from "@/lib/risk";
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
  // Pesos por tier de aderência documental (SIGEF x SERPRO)
  tierOk: 1.0, // parcela validada, diferença de área ≤ 5%
  tierAtencao: 0.6, // validada, mas diferença de área > 5%
  tierPotencial: 0.3, // sem vínculo estrito (só correspondência potencial)
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

// --- Pilar 1: Documental (dados reais, conforme o nível de risco) ---
// baixo  = só parcelas OK          | medio = OK + Atenção | alto = OK + Atenção + Potenciais
export function calcDocumental(data: SummaryData, risk: RiskLevel): Pilar {
  const validOK = data.valid_details.filter((d) => d.atencao === "OK");
  const validAtencao = data.valid_details.filter((d) => d.atencao !== "OK");

  const okArea = sum(validOK.map((d) => d.area_sigef));
  const atencaoArea = risk === "baixo" ? 0 : sum(validAtencao.map((d) => d.area_sigef));
  const potencialArea = risk === "alto" ? sum(data.non_valid_geo.map((d) => d.area_sigef)) : 0;
  const totalGeo = okArea + atencaoArea + potencialArea;

  const aderencia =
    totalGeo > 0
      ? (PARAMS.tierOk * okArea + PARAMS.tierAtencao * atencaoArea + PARAMS.tierPotencial * potencialArea) / totalGeo
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

  const nAtencao = risk === "baixo" ? 0 : validAtencao.length;
  const nPotencial = risk === "alto" ? data.non_valid_geo.length : 0;

  return {
    score: Math.round(score),
    peso: PESOS.documental,
    detalhes: [
      { label: "Parcelas validadas (OK)", valor: `${validOK.length}` },
      { label: "Parcelas com atenção (>5% dif.)", valor: `${nAtencao}` },
      { label: "Correspondências potenciais", valor: `${nPotencial}` },
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

// --- Pilar 3: Socioambiental (Panorama Socioambiental do nível de risco) ---
export function calcSocioambiental(risk: RiskLevel): Pilar {
  const alertas = contarAlertasSocio(risk);
  const score = scoreSocioambiental(risk);
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

export function calcScoreAgro(data: SummaryData, prod: ProducaoResumo | null, risk: RiskLevel): ScoreAgro {
  const documental = calcDocumental(data, risk);
  const producao = calcProducao(prod);
  const socioambiental = calcSocioambiental(risk);
  const total = Math.round(
    documental.score * PESOS.documental +
      producao.score * PESOS.producao +
      socioambiental.score * PESOS.socioambiental
  );
  return { total, classificacao: classificar(total), documental, producao, socioambiental };
}
