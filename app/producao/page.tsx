"use client";

import { useEffect, useState } from "react";
import { StepNav } from "@/components/step-nav";
import { ConsultaHeader } from "@/components/consulta-header";
import { useConsulta } from "@/components/consulta-provider";
import { getParcelasByConf } from "@/lib/risk";
import { ConfiabilidadeFiltro } from "@/components/confiabilidade-filtro";
import { CHART_TOOLTIP_STYLE } from "@/lib/chart";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Loader2, Sprout, TrendingUp, Wallet, Coins, LineChart as LineChartIcon, Info } from "lucide-react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Linha {
  cultura: string;
  safra: string;
  area: number;
  produtividade: number | null;
  preco: number | null;
  receita_bruta: number;
  custo_total: number;
  custo_arrenda_total: number;
  resultado: number;
}

interface ProducaoData {
  cpf: string;
  safras: string[];
  culturas: string[];
  linhas: Linha[];
  por_safra: { safra: string; area: number; receita_bruta: number; custo_total: number; custo_arrenda_total: number; resultado: number }[];
  totais: { area: number; receita_bruta: number; custo_total: number; custo_arrenda_total: number; resultado: number };
}

const fmtArea = (v: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

const fmtBRLc = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const fmtNum = (v: number | null) =>
  v == null ? "-" : new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v);

// Rótulos de exibição das culturas
const CULTURA_LABEL: Record<string, string> = {
  cafe: "Café",
  citrus: "Citrus",
  "lavoura perene": "Culturas permanentes",
  algodao: "Algodão",
  soja: "Soja",
  cana: "Cana",
  milho1: "Milho 1ª safra",
  milho2: "Milho 2ª safra",
  silvicultura: "Silvicultura",
  pastagem: "Pastagem",
  arroz: "Arroz",
  irrigacao: "Irrigação",
};
const labelCultura = (c: string) => CULTURA_LABEL[c] ?? c.charAt(0).toUpperCase() + c.slice(1);

// Ordem de exibição das culturas no quadro
const CULTURA_ORDER = [
  "cafe", "citrus", "lavoura perene", "algodao", "soja", "cana",
  "milho1", "milho2", "silvicultura", "pastagem",
];
const ordemCultura = (c: string) => {
  const i = CULTURA_ORDER.indexOf(c);
  return i === -1 ? 999 : i;
};

export default function ProducaoPage() {
  const { data, confSel } = useConsulta();
  const cpf = data?.cpf;

  const [prod, setProd] = useState<ProducaoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Considerar arrendamento: usa o custo_arrenda como custo de produção
  const [arrendamento, setArrendamento] = useState(false);

  useEffect(() => {
    if (!data || !cpf) {
      setProd(null);
      return;
    }
    // Parcelas consideradas conforme as confiabilidades selecionadas
    const parcelas = Array.from(getParcelasByConf(data, confSel));

    let ativo = true;
    setLoading(true);
    setError(null);
    fetch("/api/producao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cpf, parcelas }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (!ativo) return;
        if (json.error) setError(json.error);
        else setProd(json);
      })
      .catch((e) => ativo && setError(e.message))
      .finally(() => ativo && setLoading(false));
    return () => {
      ativo = false;
    };
  }, [data, cpf, confSel]);

  const temDados = prod && prod.linhas.length > 0;

  // Resultado (rentabilidade) ajustado pelo arrendamento — cai (custo_arrenda − custo base).
  // Mantém KPIs, gráfico e tabela de fluxo coerentes com o Quadro de Produção.
  const adjRes = (resultado: number, custo_total: number, custo_arrenda_total: number) =>
    arrendamento ? resultado - (custo_arrenda_total - custo_total) : resultado;
  const porSafraAdj = prod
    ? prod.por_safra.map((s) => ({ ...s, resultado: adjRes(s.resultado, s.custo_total, s.custo_arrenda_total) }))
    : [];
  const totalResultado = prod
    ? adjRes(prod.totais.resultado, prod.totais.custo_total, prod.totais.custo_arrenda_total)
    : 0;

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <StepNav />

      <section className="mx-auto w-full max-w-6xl px-6 py-10">
        <ConsultaHeader title="Quadro de Produção" />

        <ConfiabilidadeFiltro className="mb-8" />

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="mb-4 h-8 w-8 animate-spin" />
            <p>Montando o quadro de produção...</p>
          </div>
        )}

        {error && (
          <div className="mb-8 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-center text-destructive">
            {error}
          </div>
        )}

        {!loading && cpf && !temDados && !error && (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
            <Sprout className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p className="font-medium">Nenhum histórico de produção encontrado para este CPF/CNPJ.</p>
          </div>
        )}

        {temDados && (
          <div className="space-y-8">
            {/* KPIs consolidados (foco na margem líquida) */}
            {(() => {
              const n = prod!.safras.length;
              const periodo = n ? `${prod!.safras[0]}–${prod!.safras[n - 1]}` : "";
              return (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiCard
                icon={<Sprout className="h-5 w-5" />}
                label="Área Cultivada"
                value={`${fmtArea(prod!.totais.area)} ha`}
                sub={`Acumulada em ${n} safras (${periodo})`}
              />
              <KpiCard
                icon={<Coins className="h-5 w-5" />}
                label="Rentabilidade Total"
                value={fmtBRL(totalResultado)}
                sub={`Acumulado em ${n} safras (${periodo})`}
                highlight={totalResultado >= 0 ? "pos" : "neg"}
              />
              <KpiCard
                icon={<TrendingUp className="h-5 w-5" />}
                label="Rentabilidade Média / Safra"
                value={fmtBRL(n ? totalResultado / n : 0)}
                sub={`Média de ${n} safras`}
              />
              <KpiCard
                icon={<Wallet className="h-5 w-5" />}
                label="Margem Líquida / ha"
                value={fmtBRLc(prod!.totais.area ? totalResultado / prod!.totais.area : 0)}
                sub="Média do período"
              />
            </div>
              );
            })()}

            {/* Fluxo de caixa por safra */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChartIcon className="h-5 w-5 text-primary" />
                  Rentabilidade por Safra
                </CardTitle>
                <CardDescription>
                  Rentabilidade (margem líquida) estimada por safra
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={porSafraAdj} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                      <XAxis dataKey="safra" tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        stroke="currentColor"
                        className="text-muted-foreground"
                        tickFormatter={(v) => new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(v as number)}
                      />
                      <Tooltip
                        formatter={(v: number) => [fmtBRLc(v), "Rentabilidade"]}
                        contentStyle={CHART_TOOLTIP_STYLE}
                        cursor={{ fill: "rgba(255,255,255,0.05)" }}
                      />
                      <Bar dataKey="resultado" name="Resultado" radius={[4, 4, 0, 0]}>
                        {porSafraAdj.map((s) => (
                          <Cell key={s.safra} fill={s.resultado >= 0 ? "#10b981" : "#ef4444"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 text-xs tracking-tight">
                      <TableHead className="text-center py-3 w-1/3">Safra</TableHead>
                      <TableHead className="text-center py-3 w-1/3">Área (ha)</TableHead>
                      <TableHead className="text-center py-3 w-1/3">Rentabilidade (margem líquida)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {porSafraAdj.map((s) => (
                      <TableRow key={s.safra} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="text-center py-3 font-semibold">{s.safra}</TableCell>
                        <TableCell className="text-center py-3 font-mono">{fmtArea(s.area)}</TableCell>
                        <TableCell className={`text-center py-3 font-mono font-bold ${s.resultado >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                          {fmtBRL(s.resultado)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Quadro de produção detalhado */}
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="flex items-center gap-2">
                      <Sprout className="h-5 w-5 text-primary" />
                      Quadro de Produção
                    </CardTitle>
                    <CardDescription>
                      Produção estimada por cultura e safra, com produtividade, preço, custo e rentabilidade.
                    </CardDescription>
                  </div>
                  <label
                    className={cn(
                      "flex shrink-0 cursor-pointer select-none items-center gap-2.5 rounded-lg border px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors",
                      arrendamento
                        ? "border-primary/60 bg-primary/15 text-primary"
                        : "border-border bg-secondary/50 text-foreground hover:border-foreground/20 hover:bg-secondary"
                    )}
                  >
                    <Switch checked={arrendamento} onCheckedChange={setArrendamento} />
                    Considerar arrendamento
                  </label>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                {prod!.safras.map((safra) => {
                  const linhasSafra = prod!.linhas
                    .filter((l) => l.safra === safra)
                    .sort((a, b) => ordemCultura(a.cultura) - ordemCultura(b.cultura));
                  // Faturamento (receita) é fixo = custo base + rentabilidade base.
                  // O custo de produção troca para o custo com arrendamento quando marcado,
                  // e a rentabilidade cai na mesma medida (faturamento − custo de produção).
                  const calc = (l: Linha) => {
                    const faturamento = l.custo_total + l.resultado;
                    const custoProd = arrendamento ? l.custo_arrenda_total : l.custo_total;
                    return { faturamento, custoProd, rentabilidade: faturamento - custoProd };
                  };
                  const subtotal = linhasSafra.reduce(
                    (t, l) => {
                      const c = calc(l);
                      return {
                        area: t.area + l.area,
                        custoProd: t.custoProd + c.custoProd,
                        faturamento: t.faturamento + c.faturamento,
                        rentabilidade: t.rentabilidade + c.rentabilidade,
                      };
                    },
                    { area: 0, custoProd: 0, faturamento: 0, rentabilidade: 0 }
                  );
                  return (
                    <div key={safra}>
                      <div className="mb-2 flex items-center gap-2">
                        <span className="rounded-md bg-primary/10 px-2.5 py-1 text-sm font-bold text-primary">
                          Safra {safra}
                        </span>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30 text-xs tracking-tight">
                            <TableHead className="text-center py-3 w-[19%]">Cultura</TableHead>
                            <TableHead className="text-center py-3 w-[12%]">Área plantada (ha)</TableHead>
                            <TableHead className="text-center py-3 w-[13%]">
                              <span className="inline-flex items-center justify-center gap-1">
                                Produtividade
                                <UITooltip>
                                  <TooltipTrigger asChild>
                                    <button type="button" aria-label="Sobre a produtividade" className="text-muted-foreground hover:text-foreground">
                                      <Info className="h-3.5 w-3.5" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs text-center normal-case">
                                    Produtividade média estimada para região
                                  </TooltipContent>
                                </UITooltip>
                              </span>
                            </TableHead>
                            <TableHead className="text-center py-3 w-[12%]">Preço</TableHead>
                            <TableHead className="text-center py-3 w-[15%]">Custo de produção</TableHead>
                            <TableHead className="text-center py-3 w-[14%]">Faturamento</TableHead>
                            <TableHead className="text-center py-3 w-[15%]">Rentabilidade</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {linhasSafra.map((l, i) => {
                            const c = calc(l);
                            return (
                            <TableRow key={`${l.cultura}-${i}`} className="hover:bg-muted/20 transition-colors text-sm">
                              <TableCell className="text-center py-3 font-semibold">{labelCultura(l.cultura)}</TableCell>
                              <TableCell className="text-center py-3 font-mono">{fmtArea(l.area)}</TableCell>
                              <TableCell className="text-center py-3 font-mono">{fmtNum(l.produtividade)}</TableCell>
                              <TableCell className="text-center py-3 font-mono">{l.preco != null ? fmtBRLc(l.preco) : "-"}</TableCell>
                              <TableCell className="text-center py-3 font-mono">{fmtBRL(c.custoProd)}</TableCell>
                              <TableCell className="text-center py-3 font-mono">{fmtBRL(c.faturamento)}</TableCell>
                              <TableCell className={`text-center py-3 font-mono font-bold ${c.rentabilidade >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                                {fmtBRL(c.rentabilidade)}
                              </TableCell>
                            </TableRow>
                            );
                          })}
                          <TableRow className="bg-muted/40 font-bold border-t-2 border-border text-sm">
                            <TableCell className="text-center py-3 uppercase">Subtotal</TableCell>
                            <TableCell className="text-center py-3 font-mono">{fmtArea(subtotal.area)}</TableCell>
                            <TableCell className="py-3" />
                            <TableCell className="py-3" />
                            <TableCell className="text-center py-3 font-mono">{fmtBRL(subtotal.custoProd)}</TableCell>
                            <TableCell className="text-center py-3 font-mono">{fmtBRL(subtotal.faturamento)}</TableCell>
                            <TableCell className={`text-center py-3 font-mono ${subtotal.rentabilidade >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                              {fmtBRL(subtotal.rentabilidade)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  );
                })}

                <p className="text-xs text-muted-foreground">
                  Faturamento = custo de produção base + rentabilidade (receita estimada).
                  {" "}Rentabilidade = faturamento − custo de produção
                  {arrendamento ? " (com arrendamento)" : ""}.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </section>
    </main>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  highlight?: "pos" | "neg";
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-primary">{icon}</span>
          <span className="text-xs uppercase tracking-wider">{label}</span>
        </div>
        <span
          className={`font-mono text-xl font-bold ${
            highlight === "pos" ? "text-emerald-600" : highlight === "neg" ? "text-destructive" : "text-foreground"
          }`}
        >
          {value}
        </span>
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </CardContent>
    </Card>
  );
}
