"use client";

import { useConsulta } from "@/components/consulta-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { countConf, type Conf } from "@/lib/risk";
import { cn } from "@/lib/utils";
import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

// Níveis de confiabilidade fundiária (multi-seleção). Compartilhado por todas as
// telas do fluxo — a seleção vive no contexto, então todos os quadros ficam
// automaticamente interligados.
const RISK_LEVELS: {
  id: Conf;
  label: string;
  desc: string;
  icon: typeof ShieldCheck;
  active: string;
  iconColor: string;
}[] = [
  {
    id: "alta",
    label: "Alta Confiabilidade",
    desc: "Parcelas de alta confiabilidade",
    icon: ShieldCheck,
    active: "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/40",
    iconColor: "text-emerald-500",
  },
  {
    id: "media",
    label: "Média Confiabilidade",
    desc: "Parcelas de média confiabilidade",
    icon: ShieldAlert,
    active: "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/40",
    iconColor: "text-amber-500",
  },
  {
    id: "baixa",
    label: "Baixa Confiabilidade",
    desc: "Parcelas de baixa confiabilidade",
    icon: ShieldX,
    active: "border-red-500 bg-red-500/10 ring-1 ring-red-500/40",
    iconColor: "text-red-500",
  },
];

export function ConfiabilidadeFiltro({ className }: { className?: string }) {
  const { data, confSel, toggleConf } = useConsulta();
  if (!data) return null;
  const confCounts = countConf(data);

  return (
    <Card className={className}>
      <CardHeader className="py-3.5 text-center gap-1">
        <CardTitle className="text-base font-bold tracking-tight text-foreground">
          Confiabilidade Fundiária
        </CardTitle>
        <p className="text-xs leading-tight text-muted-foreground">
          Selecione uma ou mais confiabilidades para filtrar as parcelas
        </p>
      </CardHeader>
      <CardContent className="pb-3 pt-0">
        <div className="grid gap-2 sm:grid-cols-3">
          {RISK_LEVELS.map((r) => {
            const Icon = r.icon;
            const isActive = confSel.has(r.id);
            const count = confCounts[r.id];
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => toggleConf(r.id)}
                aria-pressed={isActive}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors",
                  isActive
                    ? r.active
                    : "border-border bg-background/40 hover:border-foreground/20 hover:bg-secondary/40"
                )}
              >
                <Icon className={cn("h-5 w-5 shrink-0", isActive ? r.iconColor : "text-muted-foreground")} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold leading-tight text-foreground">{r.label}</div>
                  <div className="text-[11px] leading-tight text-muted-foreground">
                    {count} parcela{count !== 1 ? "s" : ""}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
