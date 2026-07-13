import { FileText, Leaf, Sprout, Gauge, type LucideIcon } from "lucide-react";

export interface Step {
  href: string;
  label: string;
  icon: LucideIcon;
}

// Fluxo sequencial de análise. A ordem deste array define os passos 1..N.
// Módulo neutro (sem "use client") para poder ser importado tanto por
// componentes de servidor quanto de cliente.
export const STEPS: Step[] = [
  { href: "/summary", label: "Resumo Patrimonial", icon: FileText },
  { href: "/socioambiental", label: "Socioambiental", icon: Leaf },
  { href: "/producao", label: "Quadro de Produção", icon: Sprout },
  { href: "/score", label: "Score", icon: Gauge },
];
