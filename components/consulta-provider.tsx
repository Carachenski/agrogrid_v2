"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { SummaryData } from "@/lib/types";

interface ConsultaState {
  cpf: string;
  setCpf: (v: string) => void;
  data: SummaryData | null;
  loading: boolean;
  error: string | null;
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

  const fetchSummary = useCallback(async (rawCpf: string) => {
    const digits = rawCpf.replace(/\D/g, "");
    if (!digits) return;

    setLoading(true);
    setError(null);
    setData(null);

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
    <ConsultaContext.Provider value={{ cpf, setCpf, data, loading, error, fetchSummary, reset }}>
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
