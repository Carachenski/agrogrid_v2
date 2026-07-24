import { Construction } from "lucide-react";
import { StepNav } from "@/components/step-nav";
import { STEPS } from "@/components/steps";
import { ConsultaHeader } from "@/components/consulta-header";

interface UnderConstructionProps {
  href: string;
  /** @deprecated mantido por compatibilidade com as páginas; não é mais exibido */
  subtitle?: string;
}

export function UnderConstruction({ href }: UnderConstructionProps) {
  const idx = Math.max(0, STEPS.findIndex((s) => s.href === href));
  const step = STEPS[idx];

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Navegação sequencial */}
      <StepNav />

      <section className="mx-auto w-full max-w-6xl px-6 py-10">
        {/* Cabeçalho padrão (nome + confiabilidade fundiária / parcelas / hectares) */}
        <ConsultaHeader title={step.label} />

        {/* Placeholder "em construção" */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Construction className="h-8 w-8 text-primary" />
          </div>
          <p className="text-lg font-medium text-foreground">Esta etapa está em construção</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Em breve traremos a análise completa de {step.label.toLowerCase()} aqui.
          </p>
        </div>
      </section>
    </main>
  );
}
