"use client";

import { useEffect, useMemo, useState } from "react";
import { StepNav } from "@/components/step-nav";
import { ConsultaHeader } from "@/components/consulta-header";
import { useConsulta } from "@/components/consulta-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Gauge as GaugeIcon, FileCheck2, Sprout, Leaf, Users, ChevronDown } from "lucide-react";
import { calcScoreAgro, type ProducaoResumo, type Pilar } from "@/lib/score";
import { getParcelasByConf } from "@/lib/risk";
import { ConfiabilidadeFiltro } from "@/components/confiabilidade-filtro";

function GaugeRing({ value, color }: { value: number; color: string }) {
  const r = 82;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(100, value)) / 100);
  return (
    <div className="relative h-56 w-56">
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
        <circle cx="100" cy="100" r={r} fill="none" strokeWidth="16" className="stroke-secondary" />
        <circle
          cx="100"
          cy="100"
          r={r}
          fill="none"
          strokeWidth="16"
          strokeLinecap="round"
          stroke={color}
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-5xl font-black" style={{ color }}>
          {value}
        </span>
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Score Agro</span>
      </div>
    </div>
  );
}

function PilarCard({
  icon,
  titulo,
  pilar,
  cor,
  hipotetico,
}: {
  icon: React.ReactNode;
  titulo: string;
  pilar: Pilar;
  cor: string;
  hipotetico?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-primary">{icon}</span>
            <div>
              <div className="font-semibold text-foreground">{titulo}</div>
              <div className="text-xs text-muted-foreground">Peso {Math.round(pilar.peso * 100)}%</div>
            </div>
          </div>
          <span className="font-mono text-2xl font-bold" style={{ color: cor }}>
            {pilar.score}
          </span>
        </div>

        <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full" style={{ width: `${pilar.score}%`, backgroundColor: cor }} />
        </div>

        <ul className="space-y-1.5">
          {pilar.detalhes.map((d) => (
            <li key={d.label} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{d.label}</span>
              <span className="font-mono font-medium text-foreground">{d.valor}</span>
            </li>
          ))}
        </ul>

        {hipotetico && (
          <p className="mt-3 text-xs uppercase tracking-wider text-amber-500">Componente hipotético</p>
        )}
      </CardContent>
    </Card>
  );
}

interface Relacionado {
  cpf_cnpj: string;
  nome: string | null;
  qtd_ccir: number;
  qtd_car: number;
}

// Máscara de exibição: CPF 000.000.000-00 | CNPJ 00.000.000/0000-00
function mascaraCpfCnpj(v: string) {
  const d = (v || "").replace(/\D/g, "");
  if (d.length === 11)
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14)
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return v;
}

// Produção crua da API — inclui os custos para ajustar pelo arrendamento.
interface ProdRaw {
  totais: { area: number; resultado: number; custo_total: number; custo_arrenda_total: number };
  por_safra: { safra: string; resultado: number; custo_total: number; custo_arrenda_total: number }[];
}

export default function ScorePage() {
  const { data, confSel, arrendamento } = useConsulta();
  const cpf = data?.cpf;

  const [prod, setProd] = useState<ProdRaw | null>(null);
  const [loading, setLoading] = useState(false);
  const [relacionados, setRelacionados] = useState<Relacionado[] | null>(null);
  const [showRegra, setShowRegra] = useState(false);

  useEffect(() => {
    if (!data || !cpf) {
      setProd(null);
      return;
    }
    // Produção limitada às parcelas das confiabilidades selecionadas
    const parcelas = Array.from(getParcelasByConf(data, confSel));

    let ativo = true;
    setLoading(true);
    fetch("/api/producao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cpf, parcelas }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (!ativo) return;
        setProd(json.error ? null : { totais: json.totais, por_safra: json.por_safra });
      })
      .catch(() => ativo && setProd(null))
      .finally(() => ativo && setLoading(false));
    return () => {
      ativo = false;
    };
  }, [data, cpf, confSel]);

  // CPF/CNPJ relacionados (via CCIR no SERPRO e via CAR no detentores_car).
  // Independe do nível de risco: é uma análise de partes relacionadas do titular.
  useEffect(() => {
    if (!cpf) {
      setRelacionados(null);
      return;
    }
    let ativo = true;
    fetch(`/api/relacionados?cpf=${cpf}`)
      .then((r) => r.json())
      .then((json) => {
        if (ativo) setRelacionados(json.error ? [] : json.relacionados);
      })
      .catch(() => ativo && setRelacionados([]));
    return () => {
      ativo = false;
    };
  }, [cpf]);

  // Produção ajustada pelo arrendamento (rentabilidade cai custo_arrenda − custo base).
  const prodAjustado: ProducaoResumo | null = useMemo(() => {
    if (!prod) return null;
    const adj = (r: number, ct: number, cat: number) => (arrendamento ? r - (cat - ct) : r);
    return {
      totais: {
        area: prod.totais.area,
        resultado: adj(prod.totais.resultado, prod.totais.custo_total, prod.totais.custo_arrenda_total),
      },
      por_safra: prod.por_safra.map((s) => ({
        safra: s.safra,
        resultado: adj(s.resultado, s.custo_total, s.custo_arrenda_total),
      })),
    };
  }, [prod, arrendamento]);

  const score = useMemo(
    () => (data ? calcScoreAgro(data, prodAjustado, confSel) : null),
    [data, prodAjustado, confSel]
  );

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <StepNav />

      <section className="mx-auto w-full max-w-6xl px-6 py-10">
        <ConsultaHeader title="Score Agro" />

        <ConfiabilidadeFiltro className="mb-8" />

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="mb-4 h-8 w-8 animate-spin" />
            <p>Calculando o Score Agro...</p>
          </div>
        )}

        {!loading && score && (
          <div className="space-y-8">
            {/* Medidor total + classificação */}
            <Card className="overflow-hidden border-primary/20 bg-gradient-to-b from-primary/5 to-transparent">
              <CardContent className="flex flex-col items-center gap-4 py-10">
                <GaugeRing value={score.total} color={score.classificacao.cor} />
                <div
                  className="inline-block rounded-full px-5 py-1.5 text-base font-bold"
                  style={{ backgroundColor: `${score.classificacao.cor}22`, color: score.classificacao.cor }}
                >
                  {score.classificacao.label}
                </div>
              </CardContent>
            </Card>

            {/* Pilares */}
            <div className="grid gap-4 md:grid-cols-3">
              <PilarCard icon={<FileCheck2 className="h-5 w-5" />} titulo="Documental" pilar={score.documental} cor="#3b82f6" />
              <PilarCard icon={<Sprout className="h-5 w-5" />} titulo="Produção" pilar={score.producao} cor="#10b981" />
              <PilarCard icon={<Leaf className="h-5 w-5" />} titulo="Socioambiental" pilar={score.socioambiental} cor="#f59e0b" />
            </div>

            {/* Regra (recolhida por padrão) */}
            <Card>
              <CardHeader
                role="button"
                tabIndex={0}
                onClick={() => setShowRegra((v) => !v)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setShowRegra((v) => !v);
                  }
                }}
                className="cursor-pointer select-none"
              >
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <GaugeIcon className="h-5 w-5 text-primary" />
                    Como o Score é calculado
                  </CardTitle>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${
                      showRegra ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </CardHeader>
              {showRegra && (
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p className="text-foreground">
                  O Score é recalculado conforme as <b>confiabilidades selecionadas</b> no filtro —
                  os três pilares consideram apenas as parcelas e alertas dessa seleção.
                </p>
                <p>
                  <b className="text-foreground">Documental (35%)</b> — aderência fundiária das parcelas
                  selecionadas, ponderada por área conforme a confiabilidade (Alta = 1,0 · Média = 0,6 ·
                  Baixa = 0,3), combinada com a <b>regularidade do CAR</b> — proporção da área com Cadastro
                  Ambiental Rural ativo/pendente sobre a área total de CAR (cadastros cancelados reduzem a nota).
                  Composição do pilar: <b>70% aderência + 30% CAR</b>.
                </p>
                <p>
                  <b className="text-foreground">Produção (45%)</b> — mede a capacidade de pagamento com base na
                  <b> área plantada e na rentabilidade acumuladas nas últimas 4 safras</b>. Pondera a rentabilidade
                  média por hectare (peso 60%, atingindo 100% em R$ 3.500/ha) e a regularidade das safras (peso 40%,
                  chegando a 100% com resultado positivo nos quatro anos consecutivos).
                </p>
                <p>
                  <b className="text-foreground">Socioambiental (20%)</b> — proporção de camadas sem alerta no
                  Panorama Socioambiental.
                </p>
                <p className="pt-1 text-xs">
                  Score Agro = Documental×0,35 + Produção×0,45 + Socioambiental×0,20.
                </p>
              </CardContent>
              )}
            </Card>

            {/* CPF/CNPJ's relacionados */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  CPF/CNPJ&apos;s Relacionados
                </CardTitle>
                <CardDescription>
                  Outros titulares que compartilham CCIR e/ou CAR
                </CardDescription>
              </CardHeader>
              <CardContent>
                {relacionados === null ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Buscando relacionados...
                  </div>
                ) : relacionados.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum CPF/CNPJ relacionado encontrado.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 text-xs tracking-tight">
                        <TableHead className="text-center py-3">CPF / CNPJ</TableHead>
                        <TableHead className="text-center py-3">Nome</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...relacionados]
                        .sort((a, b) =>
                          (a.nome || "").localeCompare(b.nome || "", "pt-BR", { sensitivity: "base" })
                        )
                        .map((r) => (
                        <TableRow key={r.cpf_cnpj} className="hover:bg-muted/20 transition-colors text-sm">
                          <TableCell className="text-center py-3 font-mono">
                            {mascaraCpfCnpj(r.cpf_cnpj)}
                          </TableCell>
                          <TableCell className="text-center py-3 uppercase">{r.nome || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </section>
    </main>
  );
}
