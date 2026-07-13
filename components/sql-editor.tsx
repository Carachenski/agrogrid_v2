"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Play, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SQLEditorProps {
  onExecute: (query: string) => void;
  isLoading: boolean;
  initialQuery?: string;
}

export function SQLEditor({ onExecute, isLoading, initialQuery }: SQLEditorProps) {
  const [query, setQuery] = useState(
    initialQuery || "SELECT * FROM car_prop LIMIT 10;"
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const lineCount = query.split("\n").length;

  useEffect(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, [query]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      onExecute(query);
    }
    
    // Tab para indentação
    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newQuery = query.substring(0, start) + "  " + query.substring(end);
      setQuery(newQuery);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Query Editor</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Ctrl + Enter para executar
          </span>
          <Button
            size="sm"
            onClick={() => onExecute(query)}
            disabled={isLoading}
            className="gap-2"
          >
            <Play className="h-3 w-3" />
            {isLoading ? "Executando..." : "Executar"}
          </Button>
        </div>
      </div>
      
      <div className="flex-1 relative flex overflow-hidden bg-input">
        {/* Números de linha */}
        <div
          ref={lineNumbersRef}
          className="w-12 flex-shrink-0 bg-secondary/50 overflow-hidden select-none"
        >
          <div className="py-3 px-2 text-right">
            {Array.from({ length: lineCount }, (_, i) => (
              <div
                key={i + 1}
                className="text-xs leading-6 text-muted-foreground font-mono"
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>
        
        {/* Editor */}
        <textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          className="flex-1 resize-none bg-transparent text-foreground font-mono text-sm leading-6 p-3 focus:outline-none placeholder:text-muted-foreground"
          placeholder="Digite sua consulta SQL aqui..."
          spellCheck={false}
        />
      </div>
    </div>
  );
}
