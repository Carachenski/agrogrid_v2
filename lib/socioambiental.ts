import type { RiskLevel } from "@/lib/risk";

// Total de camadas socioambientais avaliadas no Panorama (ver ITEMS em app/socioambiental).
export const SOCIO_TOTAL_CAMADAS = 15;

// Alertas por nível de risco fundiário — representação do Panorama Socioambiental.
// Quanto maior o risco, mais camadas acusam sobreposição.
export const RISK_ALERTS: Record<RiskLevel, Record<string, { count: number; percent: number }>> = {
  baixo: {
    "Faixa de Fronteira": { count: 1, percent: 100 },
  },
  medio: {
    "Faixa de Fronteira": { count: 2, percent: 66 },
    "Embargos Ibama": { count: 1, percent: 22 },
  },
  alto: {
    "Faixa de Fronteira": { count: 3, percent: 48 },
    "Embargos Ibama": { count: 2, percent: 30 },
    "PRODES Alerta": { count: 1, percent: 14 },
    "Auto Infração IBAMA": { count: 1, percent: 18 },
  },
};

export function contarAlertasSocio(risk: RiskLevel): number {
  return Object.keys(RISK_ALERTS[risk]).length;
}

// Score socioambiental (0..100): proporção de camadas sem alerta no nível de risco.
export function scoreSocioambiental(risk: RiskLevel): number {
  const alertas = contarAlertasSocio(risk);
  return Math.round((100 * (SOCIO_TOTAL_CAMADAS - alertas)) / SOCIO_TOTAL_CAMADAS);
}
