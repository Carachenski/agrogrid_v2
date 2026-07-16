"use client";

import { ActiveConsulta } from "@/components/active-consulta";
import { useConsulta } from "@/components/consulta-provider";
import { getRiskStats, type RiskLevel } from "@/lib/risk";

const RISK_LABEL: Record<RiskLevel, string> = {
  baixo: "Baixo",
  medio: "Médio",
  alto: "Alto",
};

function formatArea(val: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

// Cabeçalho padrão das telas do fluxo: nome do titular + título +
// resumo do nível de risco escolhido (parcelas / hectares).
export function ConsultaHeader({ title }: { title: string }) {
  const { data, riskLevel } = useConsulta();
  const stats = data ? getRiskStats(data, riskLevel) : null;

  return (
    <>
      <ActiveConsulta />

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        {stats ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Nível de Risco Fundiário:{" "}
            <span className="font-semibold text-foreground">{RISK_LABEL[riskLevel]}</span>
            {" · "}
            <span className="font-semibold text-foreground">{stats.parcelas}</span>{" "}
            parcela{stats.parcelas !== 1 ? "s" : ""}
            {" · "}
            <span className="font-semibold text-foreground">{formatArea(stats.hectares)}</span> hectares
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Consulte um CPF/CNPJ no Resumo Patrimonial para carregar os dados.
          </p>
        )}
      </div>
    </>
  );
}
