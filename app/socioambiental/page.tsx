import { StepNav } from "@/components/step-nav";
import { ActiveConsulta } from "@/components/active-consulta";
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

type Item = {
  label: string;
  icon: LucideIcon;
  status: "ok" | "alert";
  count?: number;
  percent?: number;
};

// Representação ilustrativa (sem leitura de banco por enquanto).
// Ordem em linhas (row-major) reproduz o layout de 4 colunas do painel.
const ITEMS: Item[] = [
  { label: "Embargos Ibama", icon: Ban, status: "ok" },
  { label: "Embargos ICMBIO", icon: Ban, status: "ok" },
  { label: "Auto Infração IBAMA", icon: FileWarning, status: "ok" },
  { label: "Auto Infração ICMBIO", icon: FileWarning, status: "ok" },

  { label: "PRODES Alerta", icon: Leaf, status: "ok" },
  { label: "Amazônia Legal", icon: TreePine, status: "ok" },
  { label: "Unidades de Conservação", icon: ShieldCheck, status: "ok" },
  { label: "Terras Indígenas", icon: Tent, status: "ok" },

  { label: "Faixa de Fronteira", icon: Flag, status: "alert", count: 1, percent: 100 },
  { label: "Terras Quilombolas", icon: Home, status: "ok" },
  { label: "Processos Minerários", icon: Pickaxe, status: "ok" },
  { label: "Sítios Arqueológicos", icon: Landmark, status: "ok" },

  { label: "Assentamentos", icon: Users, status: "ok" },
  { label: "Florestas Públicas A & B", icon: Trees, status: "ok" },
  { label: "SEMA", icon: Building2, status: "ok" },
];

function StatusChip({ item }: { item: Item }) {
  const Icon = item.icon;
  const isAlert = item.status === "alert";

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-full border px-3 py-2",
        isAlert
          ? "border-red-400/50 bg-red-500/10"
          : "border-emerald-500/40 bg-emerald-500/5"
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
          <span className="text-sm font-bold">{item.count}</span>
          <span className="text-xs font-semibold">{item.percent}%</span>
          <Target className="h-4 w-4" />
        </span>
      ) : (
        <Check className="h-4 w-4 shrink-0 text-emerald-600" />
      )}
    </div>
  );
}

export default function SocioambientalPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <StepNav />

      <section className="mx-auto w-full max-w-6xl px-6 py-10">
        <ActiveConsulta />

        <h2 className="mb-6 text-2xl font-bold text-foreground">
          Panorama Socioambiental da Matrícula
        </h2>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item) => (
            <StatusChip key={item.label} item={item} />
          ))}
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Representação ilustrativa — a integração com as bases oficiais será feita em uma próxima etapa.
        </p>
      </section>
    </main>
  );
}
