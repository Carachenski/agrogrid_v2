"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileJson, FileSpreadsheet, Copy, Check, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

interface QueryResult {
  rows: Record<string, unknown>[];
  fields: { name: string; dataTypeID: number }[];
  rowCount: number;
  executionTime: number;
}

interface ResultsTableProps {
  result: QueryResult | null;
  error: string | null;
}

export function ResultsTable({ result, error }: ResultsTableProps) {
  const [copied, setCopied] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50;

  // Reset para página 1 quando os resultados mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [result]);

  const exportToJSON = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result.rows, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `query_result_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToExcel = async () => {
    if (!result || result.rows.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Resultados");

    // Definir colunas
    const columns = result.fields.map((field) => ({
      header: field.name,
      key: field.name,
      width: 20, // Largura padrão inicial
    }));
    worksheet.columns = columns;

    // Adicionar dados
    result.rows.forEach((row) => {
      const rowData: Record<string, any> = {};
      result.fields.forEach((field) => {
        let val = row[field.name];
        const fieldNameLower = field.name.toLowerCase();
        const isAreaField = fieldNameLower.includes("area") || fieldNameLower.includes("areatotal");
        
        // 1. Tratamento de Datas
        if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}(T|\b)/.test(val)) {
          const date = new Date(val);
          if (!isNaN(date.getTime())) {
            val = date;
          }
        } 
        // 2. Tratamento Especial APENAS para campos de ÁREA
        else if (isAreaField) {
          if (val !== null && val !== undefined && val !== "") {
            const numVal = typeof val === "number" ? val : Number(String(val).replace(",", "."));
            val = isNaN(numVal) ? val : numVal;
          }
        }
        // 3. Outros campos (IDs, códigos, etc) - Mantemos como estão ou convertemos para número simples se já forem
        else if (typeof val === "number") {
          val = val; // Mantém como número para o Excel, mas sem máscara especial depois
        }

        rowData[field.name] = val === null ? "NULL" : val;
      });
      worksheet.addRow(rowData);
    });

    // Formatação do cabeçalho
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F2937" }, // Gray-800
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };

    // Estilo das células e ajuste de largura
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        const field = result.fields[colNumber - 1];
        const fieldNameLower = field?.name.toLowerCase() || "";
        const isAreaField = fieldNameLower.includes("area") || fieldNameLower.includes("areatotal");

        // Bordas
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        };

        // Formatação de data
        if (cell.value instanceof Date) {
          cell.numFmt = "dd/mm/yyyy";
          cell.alignment = { vertical: "middle", horizontal: "center" };
        }
        
        // 3. Formatação EXCLUSIVA para ÁREAS (Padrão BR: 1.234,56)
        else if (isAreaField && typeof cell.value === "number") {
          cell.numFmt = "#,##0.00";
          cell.alignment = { vertical: "middle", horizontal: "right", indent: 1 };
        } 
        // 4. Outros números (IDs, etc) - Sem formatação de milhar/decimal
        else if (typeof cell.value === "number") {
          cell.numFmt = "0"; // Formato de número simples
          cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
        }
        else {
          // Alinhamento padrão para texto
          cell.alignment = { vertical: "middle", horizontal: "left", wrapText: false, indent: 1 };
        }

        // Zebra striping (cores alternadas)
        if (rowNumber > 1 && rowNumber % 2 === 0) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF9FAFB" }, // Gray-50
          };
        }
      });
    });

    // Ajuste "automático" de largura das colunas baseado no conteúdo
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      if (column.header) maxLength = column.header.toString().length;
      
      worksheet.getColumn(column.key!).eachCell({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 0;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(Math.max(12, maxLength + 4), 60); // Mínimo 12, máximo 60
    });

    // Gerar e salvar o arquivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `agrogrid_export_${Date.now()}.xlsx`);
  };

  const copyToClipboard = async () => {
    if (!result) return;
    const text = JSON.stringify(result.rows, null, 2);
    
    try {
      // Tenta usar a API moderna primeiro (funciona em localhost/HTTPS)
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback para HTTP comum/IP externo
        const textArea = document.createElement("textarea");
        textArea.value = text;
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

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <span className="text-sm font-medium text-destructive">Erro</span>
        </div>
        <div className="flex-1 p-4 bg-destructive/10">
          <pre className="text-sm font-mono text-destructive whitespace-pre-wrap">
            {error}
          </pre>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <span className="text-sm font-medium text-muted-foreground">Resultados</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <p className="text-sm">Execute uma consulta para ver os resultados</p>
            <p className="text-xs mt-1 text-muted-foreground/70">
              Tabelas disponíveis: car_prop, sigef_prop, serpro_prop, receita_prop
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(result.rows.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedRows = result.rows.slice(startIndex, startIndex + rowsPerPage);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-foreground">
            Resultados
          </span>
          <span className="text-xs text-muted-foreground">
            {result.rowCount} linha{result.rowCount !== 1 ? "s" : ""} em {result.executionTime}ms
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
            className="gap-2 text-xs"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copiado!" : "Copiar"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToJSON}
            className="gap-2 text-xs"
          >
            <FileJson className="h-3 w-3" />
            JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToExcel}
            className="gap-2 text-xs"
          >
            <FileSpreadsheet className="h-3 w-3" />
            Excel/CSV
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-secondary z-10">
            <TableRow>
              <TableHead className="w-14 text-center text-xs font-medium text-muted-foreground bg-secondary">
                #
              </TableHead>
              {result.fields.map((field) => (
                <TableHead
                  key={field.name}
                  className="text-xs font-medium text-foreground whitespace-nowrap bg-secondary px-4"
                >
                  {field.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRows.map((row, i) => (
              <TableRow key={i} className="hover:bg-secondary/50">
                <TableCell className="text-center text-xs text-muted-foreground font-mono w-14">
                  {startIndex + i + 1}
                </TableCell>
                {result.fields.map((field) => (
                  <TableCell
                    key={field.name}
                    className="text-xs font-mono text-foreground whitespace-nowrap px-4"
                    title={String(row[field.name] ?? "")}
                  >
                    {row[field.name] === null ? (
                      <span className="text-muted-foreground italic">NULL</span>
                    ) : (
                      (() => {
                        const val = row[field.name];
                        // Se for uma string que parece uma data ISO ou um objeto Date
                        if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
                          return val.split('T')[0];
                        }
                        return String(val);
                      })()
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-card shrink-0">
          <span className="text-xs text-muted-foreground">
            Mostrando {startIndex + 1}-{Math.min(startIndex + rowsPerPage, result.rows.length)} de {result.rows.length} linhas | Página {currentPage} de {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              title="Primeira página"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              title="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-xs text-foreground font-medium">
              {currentPage}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              title="Próxima página"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              title="Última página"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
