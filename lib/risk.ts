import type { SummaryData } from "@/lib/types";

// Confiabilidade fundiária de cada parcela — MESMA regra da tabela Aderência
// Documental (ver confFundiaria em app/summary/page.tsx):
//   OK -> alta | ATENÇÃO, "Área e Matrícula" -> media | demais -> baixa
export type Conf = "alta" | "media" | "baixa";
export const CONF_NIVEIS: Conf[] = ["alta", "media", "baixa"];

export function classificaConf(tag: string | null | undefined): Conf {
  if (tag === "OK") return "alta";
  if (tag === "ATENÇÃO" || tag === "Área e Matrícula") return "media";
  return "baixa";
}

// Seleção padrão: apenas alta confiabilidade.
export function confSelPadrao(): Set<Conf> {
  return new Set<Conf>(["alta"]);
}

// Contagem EXATA de parcelas por confiabilidade (não cumulativa).
export function countConf(data: SummaryData): Record<Conf, number> {
  const c: Record<Conf, number> = { alta: 0, media: 0, baixa: 0 };
  for (const d of data.valid_details) c[classificaConf(d.atencao)]++;
  for (const d of data.non_valid_geo) c[classificaConf(d.match_type)]++;
  return c;
}

// Parcelas (parcela_co) cujas confiabilidades estão na seleção `sel`.
export function getParcelasByConf(data: SummaryData, sel: Set<Conf>): Set<string> {
  const set = new Set<string>();
  for (const d of data.valid_details) {
    if (sel.has(classificaConf(d.atencao))) set.add(d.parcela_co);
  }
  for (const d of data.non_valid_geo) {
    if (sel.has(classificaConf(d.match_type))) set.add(d.parcela_co);
  }
  return set;
}

// Parcelas selecionadas + área (ha) da seleção.
export function getConfStats(data: SummaryData, sel: Set<Conf>): { parcelas: number; hectares: number } {
  const considered = getParcelasByConf(data, sel);
  const hectares = data.land_use_details
    .filter((p) => considered.has(p.parcela_co))
    .reduce((sum, p) => sum + (p.total || 0), 0);
  return { parcelas: considered.size, hectares };
}

// Confiabilidade menos confiável presente na seleção — usada pelos módulos
// que ainda operam com um único nível (Panorama Socioambiental demo).
export function confMenosConfiavel(sel: Set<Conf>): Conf {
  if (sel.has("baixa")) return "baixa";
  if (sel.has("media")) return "media";
  return "alta";
}
