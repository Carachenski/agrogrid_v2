import type { SummaryData } from "@/lib/types";

export type RiskLevel = "baixo" | "medio" | "alto";

// Conjunto de parcelas (parcela_co) consideradas conforme o nível de risco.
// Progressivo: baixo ⊆ médio ⊆ alto.
export function getConsideredParcelas(data: SummaryData, risk: RiskLevel): Set<string> {
  const set = new Set<string>();
  if (risk === "baixo") {
    data.valid_details.filter((d) => d.atencao === "OK").forEach((d) => set.add(d.parcela_co));
  } else if (risk === "medio") {
    data.valid_details.forEach((d) => set.add(d.parcela_co));
  } else {
    data.valid_details.forEach((d) => set.add(d.parcela_co));
    data.non_valid_geo.forEach((d) => set.add(d.parcela_co));
  }
  return set;
}

// Parcelas consideradas + área (ha) para o nível de risco escolhido.
export function getRiskStats(data: SummaryData, risk: RiskLevel): { parcelas: number; hectares: number } {
  const considered = getConsideredParcelas(data, risk);
  const hectares = data.land_use_details
    .filter((p) => considered.has(p.parcela_co))
    .reduce((sum, p) => sum + (p.total || 0), 0);
  return { parcelas: considered.size, hectares };
}
