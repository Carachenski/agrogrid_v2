"use client";

import { Database, Table2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const TABLES = [
  { name: "car_prop", description: "Propriedades CAR" },
  { name: "sigef_prop", description: "Propriedades SIGEF" },
  { name: "serpro_prop", description: "Propriedades SERPRO" },
  { name: "receita_prop", description: "Propriedades Receita" },
];

interface TablesSidebarProps {
  onTableClick: (tableName: string) => void;
}

export function TablesSidebar({ onTableClick }: TablesSidebarProps) {
  return (
    <div className="h-full flex flex-col bg-sidebar border-r border-sidebar-border">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-sidebar-border">
        <Database className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-sidebar-foreground">
          PostgreSQL
        </span>
      </div>
      
      <div className="flex-1 overflow-auto">
        <div className="p-2">
          <div className="text-xs font-medium text-muted-foreground px-2 py-2 uppercase tracking-wider">
            Tabelas Disponíveis
          </div>
          <div className="space-y-1">
            {TABLES.map((table) => (
              <button
                key={table.name}
                onClick={() => onTableClick(table.name)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-2 rounded-md text-left",
                  "hover:bg-sidebar-accent transition-colors group"
                )}
              >
                <Table2 className="h-4 w-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-sidebar-foreground truncate">
                    {table.name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {table.description}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="p-4 border-t border-sidebar-border">
        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-1">Dicas:</p>
          <ul className="space-y-1 text-muted-foreground/80">
            <li>• Clique em uma tabela para preencher a query</li>
            <li>• Use Ctrl+Enter para executar</li>
            <li>• Apenas SELECT é permitido</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
