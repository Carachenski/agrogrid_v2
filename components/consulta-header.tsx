"use client";

import { ActiveConsulta } from "@/components/active-consulta";
import { useConsulta } from "@/components/consulta-provider";
import { getConfStats, CONF_NIVEIS, type Conf } from "@/lib/risk";

const CONF_LABEL: Record<Conf, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
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
  const { data, confSel } = useConsulta();
  const stats = data ? getConfStats(data, confSel) : null;
  const confLabels = CONF_NIVEIS.filter((c) => confSel.has(c)).map((c) => CONF_LABEL[c]).join(", ");

  return (
    <>
      <ActiveConsulta />

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        {stats ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Confiabilidade Fundiária:{" "}
            <span className="font-semibold text-foreground">{confLabels}</span>
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
