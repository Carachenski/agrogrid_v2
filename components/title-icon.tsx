import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// "Peça" de ícone para títulos — rounded-square com degradê, anel interno e
// brilho sutil (cara de ícone de app). Dá personalidade sem depender de glyphs
// genéricos soltos. Aceita um `tint` para dar identidade por seção.
type Tint = "verde" | "azul" | "ambar" | "violeta" | "rosa";

const TINT: Record<Tint, string> = {
  verde: "from-emerald-400/30 via-emerald-400/10 text-emerald-300 ring-emerald-300/25 shadow-emerald-400/40",
  azul: "from-sky-400/30 via-sky-400/10 text-sky-300 ring-sky-300/25 shadow-sky-400/40",
  ambar: "from-amber-400/30 via-amber-400/10 text-amber-300 ring-amber-300/25 shadow-amber-400/40",
  violeta: "from-violet-400/30 via-violet-400/10 text-violet-300 ring-violet-300/25 shadow-violet-400/40",
  rosa: "from-rose-400/30 via-rose-400/10 text-rose-300 ring-rose-300/25 shadow-rose-400/40",
};

export function TitleIcon({
  icon: Icon,
  tint = "verde",
  className,
}: {
  icon: LucideIcon;
  tint?: Tint;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "agro-titleicon relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br to-transparent shadow-[0_0_22px_-8px] ring-1 ring-inset transition-transform duration-300",
        TINT[tint],
        className
      )}
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={2.1} />
    </span>
  );
}
