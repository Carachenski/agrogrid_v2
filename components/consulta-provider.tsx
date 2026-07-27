"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { SummaryData } from "@/lib/types";
import { type Conf, confSelPadrao } from "@/lib/risk";

interface ConsultaState {
  cpf: string;
  setCpf: (v: string) => void;
  data: SummaryData | null;
  loading: boolean;
  error: string | null;
  // Multi-seleção de confiabilidade fundiária (alta / media / baixa)
  confSel: Set<Conf>;
  toggleConf: (c: Conf) => void;
  // Considerar arrendamento (usa custo_arrenda) — global p/ Produção e Score
  arrendamento: boolean;
  setArrendamento: (v: boolean) => void;
  fetchSummary: (rawCpf: string) => Promise<void>;
  reset: () => void;
}

const ConsultaContext = createContext<ConsultaState | null>(null);

// Guarda o resultado da consulta acima do nível das páginas (montado no layout),
// para que o resultado persista ao navegar entre Resumo / Socioambiental / etc.
export function ConsultaProvider({ children }: { children: ReactNode }) {
  const [cpf, setCpf] = useState("");
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confSel, setConfSel] = useState<Set<Conf>>(confSelPadrao);
  const [arrendamento, setArrendamento] = useState(false);

  // Liga/desliga uma confiabilidade. Mantém sempre ao menos uma selecionada.
  const toggleConf = useCallback((c: Conf) => {
    setConfSel((prev) => {
      const next = new Set(prev);
      if (next.has(c)) {
        if (next.size === 1) return prev; // não deixa desmarcar a última
        next.delete(c);
      } else {
        next.add(c);
      }
      return next;
    });
  }, []);

  const fetchSummary = useCallback(async (rawCpf: string) => {
    const digits = rawCpf.replace(/\D/g, "");
    if (!digits) return;

    setLoading(true);
    setError(null);
    setData(null);
    setConfSel(confSelPadrao());
    setArrendamento(false);

    try {
      const response = await fetch(`/api/summary?cpf=${digits}`);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Erro ao buscar resumo");
      }
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setCpf("");
    setData(null);
    setError(null);
  }, []);

  return (
    <ConsultaContext.Provider value={{ cpf, setCpf, data, loading, error, confSel, toggleConf, arrendamento, setArrendamento, fetchSummary, reset }}>
      {children}
    </ConsultaContext.Provider>
  );
}

export function useConsulta() {
  const ctx = useContext(ConsultaContext);
  if (!ctx) {
    throw new Error("useConsulta deve ser usado dentro de <ConsultaProvider>");
  }
  return ctx;
}
