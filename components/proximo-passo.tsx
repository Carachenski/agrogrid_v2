"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { STEPS } from "@/components/steps";
import { useConsulta } from "@/components/consulta-provider";

// Convite suave para a próxima etapa do fluxo — dá continuidade entre as telas.
export function ProximoPasso() {
  const pathname = usePathname();
  const { data } = useConsulta();
  const idx = STEPS.findIndex((s) => pathname === s.href || pathname.startsWith(s.href + "/"));
  const next = idx >= 0 && idx < STEPS.length - 1 ? STEPS[idx + 1] : null;
  if (!data || !next) return null;

  const Icon = next.icon;
  return (
    <Link
      href={next.href}
      className="agro-enter group mt-10 flex items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 to-transparent px-6 py-5 transition-colors hover:border-primary/40 hover:from-primary/15"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">A seguir</p>
          <p className="text-base font-semibold text-foreground">{next.label}</p>
        </div>
      </div>
      <span className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary">
        Continuar
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
