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
    <div className="border-b border-border bg-card/50">
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
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isDone
                      ? "bg-primary/20 text-primary"
                      : "bg-secondary text-muted-foreground group-hover:bg-background"
                  )}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <Icon className="h-4 w-4 shrink-0" />
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
