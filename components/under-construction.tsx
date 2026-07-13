import Link from "next/link";
import { Construction, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepNav } from "@/components/step-nav";
import { STEPS } from "@/components/steps";
import { ActiveConsulta } from "@/components/active-consulta";

interface UnderConstructionProps {
  href: string;
  /** @deprecated mantido por compatibilidade com as páginas; não é mais exibido */
  subtitle?: string;
}

export function UnderConstruction({ href }: UnderConstructionProps) {
  const idx = Math.max(0, STEPS.findIndex((s) => s.href === href));
  const step = STEPS[idx];
  const prev = idx > 0 ? STEPS[idx - 1] : null;
  const next = idx < STEPS.length - 1 ? STEPS[idx + 1] : null;

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Navegação sequencial */}
      <StepNav />

      {/* Corpo "em construção" */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24">
        <ActiveConsulta />
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
            <Construction className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">{step.label}</h2>
          <p className="text-muted-foreground mb-8">
            Esta etapa está <strong className="text-foreground">em construção</strong>. Em breve
            traremos a análise completa aqui.
          </p>
          <div className="flex items-center justify-center gap-3">
            {prev && (
              <Link href={prev.href}>
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  {prev.label}
                </Button>
              </Link>
            )}
            {next && (
              <Link href={next.href}>
                <Button variant="ghost" className="gap-2 text-muted-foreground">
                  {next.label}
                  <ArrowLeft className="h-4 w-4 rotate-180" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
