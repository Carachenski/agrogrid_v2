"use client";

import { StepNav } from "@/components/step-nav";
import { ConsultaHeader } from "@/components/consulta-header";
import { useConsulta } from "@/components/consulta-provider";
import { type RiskLevel } from "@/lib/risk";
import { cn } from "@/lib/utils";
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
  Target,
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

// Alertas ilustrativos por nível de risco (representação de como vai ficar).
// Quanto maior o risco, mais camadas acusam sobreposição.
const RISK_ALERTS: Record<RiskLevel, Record<string, { count: number; percent: number }>> = {
  baixo: {
    "Faixa de Fronteira": { count: 1, percent: 100 },
  },
  medio: {
    "Faixa de Fronteira": { count: 2, percent: 66 },
    "Embargos Ibama": { count: 1, percent: 22 },
  },
  alto: {
    "Faixa de Fronteira": { count: 3, percent: 48 },
    "Embargos Ibama": { count: 2, percent: 30 },
    "PRODES Alerta": { count: 1, percent: 14 },
    "Auto Infração IBAMA": { count: 1, percent: 18 },
  },
};

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
  const { riskLevel } = useConsulta();
  const alerts = RISK_ALERTS[riskLevel];

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <StepNav />

      <section className="mx-auto w-full max-w-6xl px-6 py-10">
        <ConsultaHeader title="Panorama Socioambiental" />

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item) => (
            <StatusChip key={item.label} item={item} alert={alerts[item.label]} />
          ))}
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Representação ilustrativa — as porcentagens e alertas variam conforme o nível de risco
          escolhido no Resumo Patrimonial. A integração com as bases oficiais será feita em uma
          próxima etapa.
        </p>
      </section>
    </main>
  );
}
