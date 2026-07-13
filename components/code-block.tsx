"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CodeBlockProps {
  code: string;
  language: string;
  showLineNumbers?: boolean;
}

export function CodeBlock({ code, language, showLineNumbers = true }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
      } else {
        // Fallback para HTTP comum/IP externo
        const textArea = document.createElement("textarea");
        textArea.value = code;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
        } catch (err) {
          console.error('Fallback: Erro ao copiar', err);
        }
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar: ', err);
    }
  };

  const lines = code.split("\n");

  // Simple syntax highlighting using tokens to avoid regex conflicts
  const highlightLine = (line: string): React.ReactNode[] => {
    const tokens: React.ReactNode[] = [];
    let remaining = line;
    let key = 0;

    while (remaining.length > 0) {
      // Match comment first (# or //)
      const commentMatch = remaining.match(/^(#.*|\/\/.*)$/);
      if (commentMatch) {
        tokens.push(
          <span key={key++} className="text-muted-foreground">{commentMatch[0]}</span>
        );
        remaining = remaining.slice(commentMatch[0].length);
        continue;
      }

      // Match strings (double or single quotes)
      const stringMatch = remaining.match(/^(["'])(?:[^"'\\]|\\.)*?\1/);
      if (stringMatch) {
        tokens.push(
          <span key={key++} className="text-emerald-400">{stringMatch[0]}</span>
        );
        remaining = remaining.slice(stringMatch[0].length);
        continue;
      }

      // Match keywords
      const keywordMatch = remaining.match(
        /^(import|from|const|let|var|function|return|if|else|for|while|try|catch|async|await|class|def|print|with|as|new|export|require)\b/
      );
      if (keywordMatch) {
        tokens.push(
          <span key={key++} className="text-pink-400">{keywordMatch[0]}</span>
        );
        remaining = remaining.slice(keywordMatch[0].length);
        continue;
      }

      // Match curl flags
      const curlMatch = remaining.match(/^(-X|-H|-d|--data|--header|curl)\b/);
      if (curlMatch) {
        tokens.push(
          <span key={key++} className="text-cyan-400">{curlMatch[0]}</span>
        );
        remaining = remaining.slice(curlMatch[0].length);
        continue;
      }

      // Match numbers
      const numberMatch = remaining.match(/^\b\d+\b/);
      if (numberMatch) {
        tokens.push(
          <span key={key++} className="text-amber-400">{numberMatch[0]}</span>
        );
        remaining = remaining.slice(numberMatch[0].length);
        continue;
      }

      // Default: take next character as plain text
      tokens.push(remaining[0]);
      remaining = remaining.slice(1);
    }

    return tokens;
  };

  return (
    <div className="relative group rounded-lg overflow-hidden bg-[#0d1117] border border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-secondary/50 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {language}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-2 text-xs"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 mr-1 text-primary" />
              Copiado
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 mr-1" />
              Copiar
            </>
          )}
        </Button>
      </div>

      {/* Code */}
      <div className="overflow-x-auto">
        <pre className="p-4 text-sm leading-relaxed">
          <code>
            {lines.map((line, i) => (
              <div key={i} className="flex">
                {showLineNumbers && (
                  <span className="inline-block w-8 text-right pr-4 text-muted-foreground/50 select-none">
                    {i + 1}
                  </span>
                )}
                <span className="flex-1 text-foreground">
                  {highlightLine(line).length > 0 ? highlightLine(line) : "\u00A0"}
                </span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
