"use client";

import { useConsulta } from "@/components/consulta-provider";

// Deixa o nome (armazenado em CAIXA ALTA) mais legível: "ROLANDO FASSBINDER" -> "Rolando Fassbinder"
const MIN = new Set(["de", "do", "da", "dos", "das", "e"]);
function humaniza(nome: string) {
  return (nome || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => (i > 0 && MIN.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

export function ActiveConsulta() {
  const { data } = useConsulta();
  if (!data) return null;

  return (
    <div className="agro-enter mx-auto mb-8 flex w-fit flex-wrap items-center justify-center gap-x-2.5 gap-y-1 rounded-full border border-primary/20 bg-card/70 px-5 py-2.5 text-sm shadow-sm backdrop-blur">
      <span className="text-muted-foreground">Analisando</span>
      <span className="font-semibold text-foreground">{humaniza(data.detentor)}</span>
      <span className="text-muted-foreground/50">·</span>
      <span className="font-mono text-xs text-muted-foreground">{data.cpf}</span>
    </div>
  );
}
