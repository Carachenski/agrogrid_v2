"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { SQLEditor } from "@/components/sql-editor";
import { ResultsTable } from "@/components/results-table";
import { TablesSidebar } from "@/components/tables-sidebar";
import { Database, ArrowLeft, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QueryResult {
  rows: Record<string, unknown>[];
  fields: { name: string; dataTypeID: number }[];
  rowCount: number;
  executionTime: number;
}

export default function TerminalPage() {
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState("");

  const executeQuery = useCallback(async (query: string) => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || "Erro ao executar query");
        setResult(null);
      } else {
        setResult(data);
        setError(null);
      }
    } catch (err) {
      setError("Erro de conexao com o servidor");
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleTableClick = useCallback((tableName: string) => {
    setSelectedQuery(`SELECT * FROM ${tableName} LIMIT 100;`);
  }, []);

  return (
    <main className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <div className="h-6 w-px bg-border" />
          <Link href="/summary">
            <Button variant="ghost" size="sm" className="gap-2 text-primary hover:text-primary hover:bg-primary/10">
              <BarChart3 className="h-4 w-4" />
              Resumo Geral
            </Button>
          </Link>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
            <Database className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">SQL Query Console</h1>
            <p className="text-xs text-muted-foreground">Terminal de consultas PostgreSQL</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>localhost:5433</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Sidebar */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <TablesSidebar onTableClick={handleTableClick} />
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          {/* Editor and Results */}
          <ResizablePanel defaultSize={80}>
            <ResizablePanelGroup direction="vertical">
              {/* SQL Editor */}
              <ResizablePanel defaultSize={40} minSize={20}>
                <SQLEditor
                  onExecute={executeQuery}
                  isLoading={isLoading}
                  initialQuery={selectedQuery || undefined}
                  key={selectedQuery || "default"}
                />
              </ResizablePanel>
              
              <ResizableHandle withHandle />
              
              {/* Results */}
              <ResizablePanel defaultSize={60} minSize={20}>
                <ResultsTable result={result} error={error} />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Status Bar */}
      <footer className="flex items-center justify-between px-4 py-2 border-t border-border bg-card text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>Banco: postgres</span>
          <span>Tabelas: car_prop, sigef_prop, serpro_prop, receita_prop</span>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && <span className="text-primary">Executando...</span>}
          {!isLoading && result && (
            <span className="text-primary">
              {result.rowCount} registro{result.rowCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </footer>
    </main>
  );
}
