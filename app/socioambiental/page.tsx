"use client";

import { useState } from "react";
import { StepNav } from "@/components/step-nav";
import { ConsultaHeader } from "@/components/consulta-header";
import { ConfiabilidadeFiltro } from "@/components/confiabilidade-filtro";
import { useConsulta } from "@/components/consulta-provider";
import { RISK_ALERTS } from "@/lib/socioambiental";
import { confMenosConfiavel, getParcelasByConf } from "@/lib/risk";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Ban,
  FileWarning,
  Leaf,
  TreePine,
  ShieldCheck,
  Tent,
  Flag,
  Home,
  Pickaxe,
  Landmark,
  Users,
  Trees,
  Building2,
  Check,
  Copy,
  Target,
  ChevronDown,
  MapPin,
  type LucideIcon,
} from "lucide-react";

type Item = { label: string; icon: LucideIcon };

// Representação ilustrativa (sem leitura de banco). Ordem em linhas (row-major)
// reproduz o layout de 4 colunas do painel.
const ITEMS: Item[] = [
  { label: "Embargos Ibama", icon: Ban },
  { label: "Embargos ICMBIO", icon: Ban },
  { label: "Auto Infração IBAMA", icon: FileWarning },
  { label: "Auto Infração ICMBIO", icon: FileWarning },

  { label: "PRODES Alerta", icon: Leaf },
  { label: "Amazônia Legal", icon: TreePine },
  { label: "Unidades de Conservação", icon: ShieldCheck },
  { label: "Terras Indígenas", icon: Tent },

  { label: "Faixa de Fronteira", icon: Flag },
  { label: "Terras Quilombolas", icon: Home },
  { label: "Processos Minerários", icon: Pickaxe },
  { label: "Sítios Arqueológicos", icon: Landmark },

  { label: "Assentamentos", icon: Users },
  { label: "Florestas Públicas A & B", icon: Trees },
  { label: "SEMA", icon: Building2 },
];

const ICON_BY_LABEL: Record<string, LucideIcon> = Object.fromEntries(
  ITEMS.map((i) => [i.label, i.icon])
);

// Hash determinístico (mesma parcela + camada -> mesmo resultado sempre).
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// Padroniza o município: remove acentos, Title Case e conectivos em minúsculo.
const MUNI_MIN = new Set(["de", "do", "da", "dos", "das", "e"]);
function formatMunicipio(nome: string | null | undefined): string {
  if (!nome) return "";
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => (i > 0 && MUNI_MIN.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

function StatusChip({ item, alert }: { item: Item; alert?: { count: number; percent: number } }) {
  const Icon = item.icon;
  const isAlert = !!alert;

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-full border px-3 py-2",
        isAlert ? "border-red-400/50 bg-red-500/10" : "border-emerald-500/40 bg-emerald-500/5"
      )}
    >
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
          isAlert ? "bg-red-500/15 text-red-500" : "bg-emerald-500/15 text-emerald-600"
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>

      <span
        className={cn(
          "flex-1 truncate text-sm font-medium",
          isAlert ? "text-red-600 dark:text-red-400" : "text-foreground"
        )}
      >
        {item.label}
      </span>

      {isAlert ? (
        <span className="flex shrink-0 items-center gap-1.5 text-red-600 dark:text-red-400">
          <span className="text-sm font-bold">{alert.count}</span>
          <span className="text-xs font-semibold">{alert.percent}%</span>
          <Target className="h-4 w-4" />
        </span>
      ) : (
        <Check className="h-4 w-4 shrink-0 text-emerald-600" />
      )}
    </div>
  );
}

export default function SocioambientalPage() {
  const { data, confSel } = useConsulta();
  const alerts = RISK_ALERTS[confMenosConfiavel(confSel)];
  const [showParcelas, setShowParcelas] = useState(true);
  const [parcelaDialog, setParcelaDialog] = useState<string | null>(null);
  const [parcelaCopiada, setParcelaCopiada] = useState(false);

  // Camadas socioambientais ativas (com sobreposição) na seleção atual.
  const camadasAtivas = Object.entries(alerts).map(([label, a]) => ({ label, ...a }));

  // Parcelas reais da seleção (parcela_co + município + área), sem duplicar.
  const parcelasSel = data ? getParcelasByConf(data, confSel) : new Set<string>();
  const parcelasMap = new Map<
    string,
    { parcela_co: string; matricula: string; municipio: string; area: number }
  >();
  if (data) {
    for (const d of [...data.valid_details, ...data.non_valid_geo]) {
      if (parcelasSel.has(d.parcela_co) && !parcelasMap.has(d.parcela_co)) {
        parcelasMap.set(d.parcela_co, {
          parcela_co: d.parcela_co,
          matricula: d.matricula_sigef || d.matricula_serpro || "",
          municipio: d.municipio,
          area: d.area_sigef,
        });
      }
    }
  }

  // Coerência com o Panorama: cada camada ativa atinge EXATAMENTE `count` parcelas
  // (as mesmas do quadro). Escolha determinística por hash(parcela|camada).
  const parcelasArr = [...parcelasMap.values()];
  const camadasPorParcela = new Map<string, string[]>();
  for (const c of camadasAtivas) {
    const escolhidas = [...parcelasArr]
      .sort((a, b) => hashStr(`${a.parcela_co}|${c.label}`) - hashStr(`${b.parcela_co}|${c.label}`))
      .slice(0, c.count);
    for (const p of escolhidas) {
      const arr = camadasPorParcela.get(p.parcela_co) ?? [];
      arr.push(c.label);
      camadasPorParcela.set(p.parcela_co, arr);
    }
  }
  // % da área total sobreposta por parcela, coerente com o Panorama: cada camada
  // representa `percent`% da área total, distribuído entre suas `count` parcelas;
  // a soma da coluna reconcilia com a soma dos percentuais do quadro.
  const infoCamada = new Map(camadasAtivas.map((c) => [c.label, c]));
  const linhas = parcelasArr
    .map((p) => {
      const camadas = camadasPorParcela.get(p.parcela_co) ?? [];
      const pctSobreposta = camadas.reduce((acc, label) => {
        const c = infoCamada.get(label);
        return acc + (c && c.count > 0 ? c.percent / c.count : 0);
      }, 0);
      return { ...p, camadas, pctSobreposta };
    })
    .filter((l) => l.camadas.length > 0)
    .sort((a, b) => b.camadas.length - a.camadas.length || a.parcela_co.localeCompare(b.parcela_co));

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <StepNav />

      <section className="mx-auto w-full max-w-6xl px-6 py-10 space-y-8">
        <ConsultaHeader title="Panorama Socioambiental" />

        <ConfiabilidadeFiltro />

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item) => (
            <StatusChip key={item.label} item={item} alert={alerts[item.label]} />
          ))}
        </div>

        {/* Parcelas atingidas por sobreposições socioambientais */}
        {data && (
          <Card>
            <CardHeader
              role="button"
              tabIndex={0}
              onClick={() => setShowParcelas((v) => !v)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setShowParcelas((v) => !v);
                }
              }}
              className="cursor-pointer select-none"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Parcelas Atingidas por Sobreposições
                  </CardTitle>
                  <CardDescription>
                    Parcelas com sobreposição às camadas socioambientais ativas.
                  </CardDescription>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  <span className="hidden sm:inline">{linhas.length} parcela(s)</span>
                  <ChevronDown
                    className={cn("h-5 w-5 transition-transform", showParcelas && "rotate-180")}
                  />
                </div>
              </div>
            </CardHeader>
            {showParcelas && (
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 text-xs uppercase tracking-tighter">
                      <TableHead className="text-center py-2 px-2 h-9">Parcela</TableHead>
                      <TableHead className="text-center py-2 px-2 h-9">Matrícula</TableHead>
                      <TableHead className="text-center py-2 px-2 h-9">Área Total (ha)</TableHead>
                      <TableHead className="text-center py-2 px-2 h-9">Município</TableHead>
                      <TableHead className="text-center py-2 px-2 h-9">% Área Sobreposta</TableHead>
                      <TableHead className="text-center py-2 px-2 h-9">Sobreposições</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linhas.length > 0 ? (
                      linhas.map((l) => (
                        <TableRow
                          key={l.parcela_co}
                          className="hover:bg-muted/20 transition-colors text-xs text-center align-middle"
                        >
                          <TableCell className="py-3 px-2 font-mono">
                            <button
                              type="button"
                              onClick={() => {
                                setParcelaCopiada(false);
                                setParcelaDialog(l.parcela_co);
                              }}
                              title="Clique para ver e copiar o código completo"
                              className="mx-auto block max-w-[70px] truncate text-xs hover:text-primary hover:underline cursor-pointer"
                            >
                              {l.parcela_co}
                            </button>
                          </TableCell>
                          <TableCell className="py-3 px-2">{l.matricula || "-"}</TableCell>
                          <TableCell className="py-3 px-2 font-mono">
                            {new Intl.NumberFormat("pt-BR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }).format(l.area)}
                          </TableCell>
                          <TableCell className="py-3 px-2">{formatMunicipio(l.municipio)}</TableCell>
                          <TableCell className="py-3 px-2 font-mono">
                            {new Intl.NumberFormat("pt-BR", {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                            }).format(l.pctSobreposta)}
                            %
                          </TableCell>
                          <TableCell className="py-3 px-2">
                            <div className="flex flex-wrap justify-center gap-1.5">
                              {l.camadas.map((label) => {
                                const Icon = ICON_BY_LABEL[label] ?? Target;
                                return (
                                  <span
                                    key={label}
                                    className="inline-flex items-center gap-1 rounded-full border border-red-400/40 bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-600 dark:text-red-400"
                                  >
                                    <Icon className="h-3 w-3" />
                                    {label}
                                  </span>
                                );
                              })}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-8 text-center text-muted-foreground text-sm font-medium"
                        >
                          Nenhuma parcela atingida por sobreposições socioambientais na seleção atual.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            )}
          </Card>
        )}
      </section>

      {/* Diálogo com o código completo da parcela + botão de copiar */}
      <Dialog open={parcelaDialog !== null} onOpenChange={(o) => !o && setParcelaDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Código da parcela</DialogTitle>
            <DialogDescription>Código completo da parcela SIGEF.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded-md bg-muted px-3 py-2 font-mono text-sm">
              {parcelaDialog}
            </code>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={async () => {
                if (!parcelaDialog) return;
                try {
                  await navigator.clipboard.writeText(parcelaDialog);
                  setParcelaCopiada(true);
                  setTimeout(() => setParcelaCopiada(false), 1500);
                } catch {
                  /* clipboard indisponível */
                }
              }}
              title="Copiar código"
            >
              {parcelaCopiada ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
