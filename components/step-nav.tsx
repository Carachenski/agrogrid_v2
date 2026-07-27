"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { STEPS } from "@/components/steps";

export { STEPS };
export type { Step } from "@/components/steps";

export function StepNav({ actions }: { actions?: ReactNode }) {
  const pathname = usePathname();
  const activeIndex = Math.max(
    0,
    STEPS.findIndex((s) => pathname === s.href || pathname.startsWith(s.href + "/"))
  );

  return (
    <div className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 flex items-center gap-3">
        {/* espaçador esquerdo — mantém os passos centralizados */}
        <div className="flex-1" />
        <nav
          aria-label="Etapas da análise"
          className="flex items-center justify-center gap-1 overflow-x-auto py-3"
        >
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === activeIndex;
          const isDone = i < activeIndex;

          return (
            <div key={step.href} className="flex items-center shrink-0">
              <Link
                href={step.href}
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "group flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset transition-all duration-300 group-hover:scale-105",
                    isActive
                      ? "bg-gradient-to-br from-primary/35 to-primary/5 text-primary ring-primary/30 shadow-[0_0_18px_-6px] shadow-primary/60"
                      : isDone
                      ? "bg-primary/15 text-primary ring-primary/20"
                      : "bg-secondary/70 text-muted-foreground ring-border group-hover:bg-background"
                  )}
                >
                  {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" strokeWidth={2.1} />}
                  {/* nº do passo como selo discreto */}
                  {!isDone && (
                    <span
                      className={cn(
                        "absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold ring-2 ring-card",
                        isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                      )}
                    >
                      {i + 1}
                    </span>
                  )}
                </span>
                <span className="text-sm font-medium whitespace-nowrap">{step.label}</span>
              </Link>

              {i < STEPS.length - 1 && (
                <div className="mx-1 h-px w-6 bg-border shrink-0" aria-hidden="true" />
              )}
            </div>
          );
        })}
        </nav>
        {/* ações à direita (ex.: Exportar PDF) */}
        <div className="flex-1 flex justify-end">{actions}</div>
      </div>
    </div>
  );
}
