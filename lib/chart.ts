import type { CSSProperties } from "react";

// Estilo padrão do tooltip dos gráficos (recharts), seguindo o tema do app
// em vez de cores fixas. Usa os tokens de cor via CSS variables.
export const CHART_TOOLTIP_STYLE: CSSProperties = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  color: "var(--foreground)",
};

// O recharts pinta o label e os itens com cor própria (escura), que somem no
// fundo escuro do card — forçamos a cor do texto pelo tema.
export const CHART_TOOLTIP_LABEL_STYLE: CSSProperties = {
  color: "var(--foreground)",
  fontWeight: 600,
};

export const CHART_TOOLTIP_ITEM_STYLE: CSSProperties = {
  color: "var(--foreground)",
};
