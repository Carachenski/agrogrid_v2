"use client";

import { useConsulta } from "@/components/consulta-provider";

export function ActiveConsulta() {
  const { data } = useConsulta();
  if (!data) return null;

  return (
    <div className="mx-auto mb-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border border-border bg-card/60 px-4 py-2 text-sm">
      <span className="text-muted-foreground">Consulta ativa:</span>
      <span className="font-mono font-medium text-foreground">{data.cpf}</span>
      <span className="text-muted-foreground">•</span>
      <span className="font-medium uppercase text-foreground">{data.detentor}</span>
    </div>
  );
}
