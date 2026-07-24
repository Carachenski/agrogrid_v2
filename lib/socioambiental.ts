import type { Conf } from "@/lib/risk";

// Total de camadas socioambientais avaliadas no Panorama (ver ITEMS em app/socioambiental).
export const SOCIO_TOTAL_CAMADAS = 15;

// Alertas por confiabilidade fundiária — representação do Panorama Socioambiental.
// Quanto menor a confiabilidade, mais camadas acusam sobreposição.
export const RISK_ALERTS: Record<Conf, Record<string, { count: number; percent: number }>> = {
  alta: {
    "PRODES Alerta": { count: 1, percent: 3 },
  },
  media: {
    "PRODES Alerta": { count: 2, percent: 5 },
    "Embargos Ibama": { count: 1, percent: 2 },
  },
  baixa: {
    "PRODES Alerta": { count: 3, percent: 6 },
    "Embargos Ibama": { count: 2, percent: 4 },
    "Faixa de Fronteira": { count: 1, percent: 1 },
    "Auto Infração IBAMA": { count: 1, percent: 2 },
  },
};

export function contarAlertasSocio(conf: Conf): number {
  return Object.keys(RISK_ALERTS[conf]).length;
}

// Score socioambiental (0..100): proporção de camadas sem alerta na confiabilidade.
export function scoreSocioambiental(conf: Conf): number {
  const alertas = contarAlertasSocio(conf);
  return Math.round((100 * (SOCIO_TOTAL_CAMADAS - alertas)) / SOCIO_TOTAL_CAMADAS);
}
