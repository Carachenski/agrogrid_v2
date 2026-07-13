"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Database, ArrowLeft, Search, Loader2, FileText, CheckCircle, BarChart3, MapPin, PieChart as PieChartIcon, Download, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import jsPDF from "jspdf";
import * as htmlToImage from "html-to-image";

interface SummaryItem {
  table: string;
  label: string;
  count: number;
  total_area: number;
}

interface SummaryData {
  cpf: string;
  detentor: string;
  summary: SummaryItem[];
  car_details: {
    status: string;
    count: number;
    total_area: number;
  }[];
  geo_details: {
    label: string;
    count: number;
    total_area: number;
  }[];
  ccir_details: {
    label: string;
    count: number;
    total_area: number;
  }[];
  cib_details: {
    label: string;
    count: number;
    total_area: number;
  }[];
  mun_details: {
    municipio: string;
    uf: string;
    count: number;
    total_area: number;
  }[];
  range_details: {
    label: string;
    count: number;
    total_area: number;
  }[];
  valid_details: {
    parcela_co: string;
    ccir: string;
    area_sigef: number;
    area_serpro: number;
    diferenca: number;
    atencao: string;
    municipio: string;
    matricula: string;
  }[];
  non_valid_geo: {
    parcela_co: string;
    ccir_sigef: string;
    ccir_serpro: string;
    matricula_sigef: string;
    matricula_serpro: string;
    area_sigef: number;
    area_serpro: number;
    match_type: string | null;
    municipio: string;
    uf: string;
  }[];
  map_points: {
    lat: number;
    lng: number;
  }[];
  land_use_details: {
    parcela_co: string;
    irrigacao: number;
    agricultura: number;
    pastagem: number;
    culturas_permanentes: number;
    reflorestamento: number;
    mata_app_outros: number;
    total: number;
    total_minimo: number;
    total_maximo: number;
  }[];
}

const SOIL_COLORS = {
  irrigacao: "#3b82f6", // Azul
  agricultura: "#10b981", // Verde
  pastagem: "#f59e0b", // Amarelo
  culturas_permanentes: "#f97316", // Laranja
  reflorestamento: "#8b5cf6", // Roxo
  mata_app_outros: "#06b6d4", // Ciano
};

function ColumnFilter({ 
  title, 
  options, 
  selectedValues, 
  onFilterChange 
}: { 
  title: string, 
  options: string[], 
  selectedValues: string[] | undefined, 
  onFilterChange: (values: string[] | undefined) => void 
}) {
  const [search, setSearch] = useState("");
  
  const filteredOptions = options.filter(opt => 
    String(opt).toLowerCase().includes(search.toLowerCase())
  );

  const isFilterActive = selectedValues !== undefined;
  const currentValues = selectedValues || options;
  
  const allSelected = !isFilterActive;
  const isNoneSelected = isFilterActive && currentValues.length === 0;
  const isPartialFilter = isFilterActive && currentValues.length > 0 && currentValues.length < options.length;

  const toggleValue = (val: string) => {
    if (!isFilterActive) {
      onFilterChange(options.filter(v => v !== val));
    } else {
      const newValues = currentValues.includes(val)
        ? currentValues.filter(v => v !== val)
        : [...currentValues, val];
      
      if (newValues.length === options.length) {
        onFilterChange(undefined);
      } else {
        onFilterChange(newValues);
      }
    }
  };

  const selectAll = () => {
    onFilterChange(undefined);
  };

  const deselectAll = () => {
    onFilterChange([]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-1 hover:bg-emerald-500/20">
          <Filter className={`h-3 w-3 ${isPartialFilter || isNoneSelected ? "text-emerald-500 fill-emerald-500" : "text-muted-foreground"}`} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2 bg-card border-border" align="start">
        <div className="space-y-2">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-xs font-bold text-foreground">Filtrar {title}</p>
            {isFilterActive && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-5 px-1.5 text-[10px] text-emerald-500 hover:text-emerald-500 hover:bg-emerald-500/10"
                onClick={() => onFilterChange(undefined)}
              >
                Limpar
              </Button>
            )}
          </div>
          <Input 
            placeholder="Pesquisar..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs bg-muted/50 border-border"
          />
          
          <div className="space-y-1 py-1 border-b border-border mb-1">
            <div 
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-secondary/50 rounded-sm transition-colors cursor-pointer" 
              onClick={selectAll}
            >
              <Checkbox 
                id={`select-all-${title}`} 
                checked={allSelected}
                onCheckedChange={selectAll}
                className={allSelected ? "border-emerald-500 data-[state=checked]:bg-emerald-500" : ""}
              />
              <label 
                htmlFor={`select-all-${title}`} 
                className={`text-xs cursor-pointer flex-1 font-medium transition-colors ${allSelected ? "text-emerald-500" : "text-foreground"}`}
              >
                (Selecionar Tudo)
              </label>
            </div>
            <div 
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-secondary/50 rounded-sm transition-colors cursor-pointer" 
              onClick={deselectAll}
            >
              <Checkbox 
                id={`deselect-all-${title}`} 
                checked={isNoneSelected}
                onCheckedChange={deselectAll}
                className={isNoneSelected ? "border-emerald-500 data-[state=checked]:bg-emerald-500" : ""}
              />
              <label 
                htmlFor={`deselect-all-${title}`} 
                className="text-xs cursor-pointer flex-1 font-medium transition-colors text-foreground"
              >
                (Deselecionar Tudo)
              </label>
            </div>
          </div>

          <ScrollArea className="h-48 pr-3">
            <div className="space-y-0.5">
              {filteredOptions.map((opt) => (
                <div 
                  key={opt} 
                  className="flex items-center gap-2 px-2 py-1 hover:bg-secondary/50 rounded-sm transition-colors cursor-pointer"
                  onClick={() => toggleValue(opt)}
                >
                  <Checkbox 
                    id={`opt-${title}-${opt}`} 
                    checked={currentValues.includes(opt)}
                    onCheckedChange={() => toggleValue(opt)}
                    className={isPartialFilter && currentValues.includes(opt) ? "border-emerald-500 data-[state=checked]:bg-emerald-500" : ""}
                  />
                  <label 
                    htmlFor={`opt-${title}-${opt}`} 
                    className={`text-xs cursor-pointer flex-1 truncate py-0.5 ${isPartialFilter && currentValues.includes(opt) ? "text-emerald-500 font-bold" : ""}`}
                  >
                    {opt || "(Vazio)"}
                  </label>
                </div>
              ))}
              {filteredOptions.length === 0 && (
                <p className="text-[10px] text-muted-foreground text-center py-4">Nenhum resultado encontrado</p>
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}

const getUniqueValues = (data: any[], key: string) => {
  return Array.from(new Set(data.map(item => String(item[key] || "")))).sort();
};

export default function SummaryPage() {
  const [cpf, setCpf] = useState("");
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validFilters, setValidFilters] = useState<Record<string, string[] | undefined>>({});
  const [nonValidFilters, setNonValidFilters] = useState<Record<string, string[] | undefined>>({});
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (data?.map_points && data.map_points.length > 0 && typeof window !== 'undefined') {
      const loadMap = async () => {
        // Carregar Leaflet dinamicamente
        if (!(window as any).L) {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
          script.crossOrigin = '';
          document.head.appendChild(script);

          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
          link.crossOrigin = '';
          document.head.appendChild(link);

          script.onload = () => initMap();
        } else {
          initMap();
        }
      };

      const initMap = () => {
        const L = (window as any).L;
        if (!L || !mapContainerRef.current) return;

        // Limpar mapa anterior
        if (mapRef.current) {
          mapRef.current.remove();
        }

        const map = L.map(mapContainerRef.current).setView([data.map_points[0].lat, data.map_points[0].lng], 10);
        mapRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const bounds = L.latLngBounds([]);
        data.map_points.forEach(point => {
          L.marker([point.lat, point.lng]).addTo(map);
          bounds.extend([point.lat, point.lng]);
        });

        if (data.map_points.length > 1) {
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      };

      loadMap();
    }
  }, [data]);

  const fetchSummary = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!cpf.trim()) return;

    setLoading(true);
    setError(null);
    setData(null);
    setValidFilters({});
    setNonValidFilters({});

    try {
      const response = await fetch(`/api/summary?cpf=${cpf.replace(/\D/g, "")}`);
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
  };

  const formatArea = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const handleExportPDF = async () => {
    if (!contentRef.current || !data) return;
    
    setExporting(true);
    try {
      const element = contentRef.current;

      // Injetar estilo para esconder scrollbars e fixar dimensões
      const hideScrollStyle = document.createElement("style");
      hideScrollStyle.innerHTML = `
        ::-webkit-scrollbar { display: none !important; }
        * { scrollbar-width: none !important; }
        .pdf-capture-fix .leaflet-container { width: 1100px !important; height: 400px !important; }
      `;
      document.head.appendChild(hideScrollStyle);

      // Pequeno delay para renderização
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Gera a imagem do conteúdo total
      const canvas = await htmlToImage.toCanvas(element, {
        pixelRatio: 2,
        backgroundColor: "#030712",
        width: 1200,
        style: {
          width: '1200px',
          margin: '0',
          padding: '40px',
        }
      });

      const imgData = canvas.toDataURL("image/png");
      
      // Calcular dimensões dinâmicas para o PDF (Página Única Contínua)
      const imgWidthMm = 210; // Largura padrão A4 em mm
      const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;

      // Criar PDF com o tamanho exato necessário para o conteúdo
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [imgWidthMm, imgHeightMm]
      });

      pdf.addImage(imgData, "PNG", 0, 0, imgWidthMm, imgHeightMm);

      document.head.removeChild(hideScrollStyle);
      pdf.save(`resumo_agrogrid_${data.cpf}.pdf`);
    } catch (err) {
      console.error("Erro ao gerar PDF de página única:", err);
      alert("Houve um erro ao gerar o download automático. Tente novamente.");
    } finally {
      setExporting(false);
    }
  };

  const filteredValidDetails = data?.valid_details.filter(item => {
    return Object.entries(validFilters).every(([key, values]) => {
      if (values === undefined) return true; // Mostra tudo se o filtro não foi tocado ou foi limpo
      return values.includes(String((item as any)[key] || "")); // Filtra estritamente se houver uma lista (mesmo que vazia)
    });
  }) || [];

  const filteredNonValidGeo = data?.non_valid_geo.filter(item => {
    return Object.entries(nonValidFilters).every(([key, values]) => {
      if (values === undefined) return true; // Mostra tudo se o filtro não foi tocado ou foi limpo
      return values.includes(String((item as any)[key] || "")); // Filtra estritamente se houver uma lista (mesmo que vazia)
    });
  }) || [];

  const visibleParcelas = new Set([
    ...filteredValidDetails.map(d => d.parcela_co),
    ...filteredNonValidGeo.map(d => d.parcela_co)
  ]);

  const filteredLandUse = data?.land_use_details.filter(item => visibleParcelas.has(item.parcela_co)) || [];

  const landUseSummary = filteredLandUse.reduce((acc, curr) => ({
    irrigacao: acc.irrigacao + curr.irrigacao,
    agricultura: acc.agricultura + curr.agricultura,
    pastagem: acc.pastagem + curr.pastagem,
    culturas_permanentes: acc.culturas_permanentes + curr.culturas_permanentes,
    reflorestamento: acc.reflorestamento + curr.reflorestamento,
    mata_app_outros: acc.mata_app_outros + curr.mata_app_outros,
    total: acc.total + curr.total,
    total_minimo: acc.total_minimo + curr.total_minimo,
    total_maximo: acc.total_maximo + curr.total_maximo,
  }), {
    irrigacao: 0,
    agricultura: 0,
    pastagem: 0,
    culturas_permanentes: 0,
    reflorestamento: 0,
    mata_app_outros: 0,
    total: 0,
    total_minimo: 0,
    total_maximo: 0,
  });

  const carTotalArea = data?.summary.find(s => s.table === "car_prop")?.total_area || 0;
  const geoTotalArea = data?.summary.find(s => s.table === "sigef_prop")?.total_area || 0;
  const ccirTotalArea = data?.ccir_details?.[0]?.total_area || 0;
  const cibBaseArea = data?.cib_details?.[0]?.total_area || 0;

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            </Link>
            <div className="h-6 w-px bg-border mx-1" />
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
              <BarChart3 className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Resumo</h1>
              <p className="text-xs text-muted-foreground">Analise consolidada por CPF</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {data && (
              <Button 
                onClick={handleExportPDF} 
                disabled={exporting} 
                variant="secondary" 
                size="sm" 
                className="gap-2"
              >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {exporting ? "Gerando PDF..." : "Exportar PDF"}
              </Button>
            )}
            <Link href="/terminal">
              <Button variant="outline" size="sm" className="gap-2">
                <Database className="h-4 w-4" />
                Terminal SQL
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero / Search */}
      <section className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Consulte o resumo de um CPF ou CNPJ</h2>
          <p className="text-muted-foreground mb-8">
            Obtenha rapidamente a quantidade de registros e a area total em todas as bases de dados.
          </p>
          
          <form onSubmit={fetchSummary} className="flex gap-2 max-w-md mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Digite o CPF ou CNPJ (apenas numeros)"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className="pl-10"
                maxLength={14}
              />
            </div>
            <Button type="submit" disabled={loading || !cpf}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Consultar"}
            </Button>
          </form>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-6xl mx-auto px-6 py-12" ref={contentRef}>
        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-center mb-8">
            {error}
          </div>
        )}

        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p>Buscando informacoes nos bancos de dados...</p>
          </div>
        )}

        {data && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Stats Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>CPF ou CNPJ Consultado</CardDescription>
                  <CardTitle className="text-2xl font-mono">{data.cpf}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Nome do Titular / Detentor</CardDescription>
                  <CardTitle className="text-2xl uppercase">{data.detentor}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Map Section */}
            {data.map_points && data.map_points.length > 0 && (
              <Card className="overflow-hidden">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="h-5 w-5 text-primary" />
                    Localização das Propriedades (centroides)
                  </CardTitle>
                  <CardDescription>
                    Visualização geográfica dos pontos registrados para este CPF.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div 
                    ref={mapContainerRef} 
                    className="h-[400px] w-full bg-muted relative z-0"
                    style={{ minHeight: '400px' }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Summary Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Distribuição Geral
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="py-4 w-[40%]">Origem dos Dados</TableHead>
                      <TableHead className="text-center py-4 w-[20%]">Quantidade</TableHead>
                      <TableHead className="text-right py-4 w-[40%]">Area Total (ha)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.summary.map((row) => (
                      <TableRow key={row.table} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="py-4">
                          <div className="font-semibold text-foreground">{row.label}</div>
                        </TableCell>
                        <TableCell className="text-center py-4">
                          <span className="text-base font-medium">{row.count}</span>
                        </TableCell>
                        <TableCell className="text-right py-4">
                          <span className="text-base font-mono font-medium">{formatArea(row.total_area)}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Detailings Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* CCIR Detailing */}
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold">
                      CC
                    </div>
                    Detalhamento CCIR
                  </CardTitle>
                  <CardDescription>
                    Resumo de detenção e área proporcional no SERPRO.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary/10 border-primary/20">
                        <TableHead className="py-4 w-[40%]">Tipo de Registro</TableHead>
                        <TableHead className="text-center py-4 w-[20%]">Quantidade</TableHead>
                        <TableHead className="text-right py-4 w-[25%]">Area Total (ha)</TableHead>
                        <TableHead className="text-right py-4 w-[15%]">% Area</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.ccir_details.map((item, idx) => {
                        const percentage = ccirTotalArea > 0 ? (item.total_area / ccirTotalArea) * 100 : 0;
                        return (
                          <TableRow key={item.label} className="border-primary/10 hover:bg-primary/10 transition-colors">
                            <TableCell className="py-4 font-semibold">{item.label}</TableCell>
                            <TableCell className="text-center py-4 text-base">{item.count}</TableCell>
                            <TableCell className="text-right py-4 font-mono text-base">{formatArea(item.total_area)}</TableCell>
                            <TableCell className="text-right py-4 font-mono font-bold text-primary">
                              {idx === 0 ? "100.0%" : `${percentage.toFixed(1)}%`}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* CAR Detailing */}
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground">
                      C
                    </div>
                    Detalhamento CAR
                  </CardTitle>
                  <CardDescription>
                    Analise da situacao cadastral das propriedades no CAR.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary/10 border-primary/20">
                        <TableHead className="py-4 w-[40%]">Status da Propriedade</TableHead>
                        <TableHead className="text-center py-4 w-[20%]">Quantidade</TableHead>
                        <TableHead className="text-right py-4 w-[25%]">Area Total (ha)</TableHead>
                        <TableHead className="text-right py-4 w-[15%]">% Area</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {["Ativos/Pendentes", "Cancelados", "Outros"].map((statusLabel) => {
                        const detail = data.car_details.find(d => d.status === statusLabel) || { status: statusLabel, count: 0, total_area: 0 };
                        const percentage = carTotalArea > 0 ? (detail.total_area / carTotalArea) * 100 : 0;
                        
                        return (
                          <TableRow key={statusLabel} className="border-primary/10 hover:bg-primary/10 transition-colors">
                            <TableCell className="py-4 font-semibold">{statusLabel}</TableCell>
                            <TableCell className="text-center py-4 text-base">{detail.count}</TableCell>
                            <TableCell className="text-right py-4 font-mono text-base">{formatArea(detail.total_area)}</TableCell>
                            <TableCell className="text-right py-4 font-mono font-bold text-primary">
                              {percentage.toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* GEO Detailing */}
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold">
                      G
                    </div>
                    Detalhamento GEO
                  </CardTitle>
                  <CardDescription>
                    Resumo de parcelas e matriculas certificadas no SIGEF.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary/10 border-primary/20">
                        <TableHead className="py-4 w-[40%]">Tipo de Registro</TableHead>
                        <TableHead className="text-center py-4 w-[20%]">Quantidade</TableHead>
                        <TableHead className="text-right py-4 w-[25%]">Area Total (ha)</TableHead>
                        <TableHead className="text-right py-4 w-[15%]">% Area</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.geo_details.map((item) => {
                        const percentage = geoTotalArea > 0 ? (item.total_area / geoTotalArea) * 100 : 0;
                        return (
                          <TableRow key={item.label} className="border-primary/10 hover:bg-primary/10 transition-colors">
                            <TableCell className="py-4 font-semibold">{item.label}</TableCell>
                            <TableCell className="text-center py-4 text-base">{item.count}</TableCell>
                            <TableCell className="text-right py-4 font-mono text-base">{formatArea(item.total_area)}</TableCell>
                            <TableCell className="text-right py-4 font-mono font-bold text-primary">
                              {percentage.toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* CIB Detailing */}
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold">
                      CB
                    </div>
                    Detalhamento CIB
                  </CardTitle>
                  <CardDescription>
                    Analise de conformidade com a Receita Federal.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary/10 border-primary/20">
                        <TableHead className="py-4 w-[40%]">Status do CIB</TableHead>
                        <TableHead className="text-center py-4 w-[20%]">Quantidade</TableHead>
                        <TableHead className="text-right py-4 w-[25%]">Area Total (ha)</TableHead>
                        <TableHead className="text-right py-4 w-[15%]">% Area</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.cib_details.map((item, idx) => {
                        const percentage = cibBaseArea > 0 ? (item.total_area / cibBaseArea) * 100 : 0;
                        return (
                          <TableRow key={item.label} className="border-primary/10 hover:bg-primary/10 transition-colors">
                            <TableCell className="py-4 font-semibold">{item.label}</TableCell>
                            <TableCell className="text-center py-4 text-base">{item.count}</TableCell>
                            <TableCell className="text-right py-4 font-mono text-base">{formatArea(item.total_area)}</TableCell>
                            <TableCell className="text-right py-4 font-mono font-bold text-primary">
                              {idx === 0 ? "100.0%" : `${percentage.toFixed(1)}%`}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Municipality Detailing */}
              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-amber-600 flex items-center justify-center text-white font-bold">
                      M
                    </div>
                    Distribuição por Município
                  </CardTitle>
                  <CardDescription>
                    Resumo de área total proporcional por localização geográfica.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-amber-500/10 border-amber-500/20">
                        <TableHead className="py-4 w-[40%]">Município - UF</TableHead>
                        <TableHead className="text-center py-4 w-[15%]">Qtd</TableHead>
                        <TableHead className="text-right py-4 w-[30%]">Area Titular (ha)</TableHead>
                        <TableHead className="text-right py-4 w-[15%]">% Area</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const munTotalArea = data.mun_details.reduce((acc, curr) => acc + curr.total_area, 0);
                        return data.mun_details.map((item) => {
                          const percentage = munTotalArea > 0 ? (item.total_area / munTotalArea) * 100 : 0;
                          return (
                            <TableRow key={`${item.municipio}-${item.uf}`} className="border-amber-500/10 hover:bg-amber-500/10 transition-colors">
                              <TableCell className="py-4 font-semibold">{item.municipio} - {item.uf}</TableCell>
                              <TableCell className="text-center py-4 text-base">{item.count}</TableCell>
                              <TableCell className="text-right py-4 font-mono text-base">{formatArea(item.total_area)}</TableCell>
                              <TableCell className="text-right py-4 font-mono font-bold text-amber-600">
                                {percentage.toFixed(1)}%
                              </TableCell>
                            </TableRow>
                          );
                        });
                      })()}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Range Detailing */}
              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-amber-600 flex items-center justify-center text-white font-bold">
                      T
                    </div>
                    Classificação por Tamanho
                  </CardTitle>
                  <CardDescription>
                    Distribuição das propriedades por faixas de área titular.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-amber-500/10 border-amber-500/20">
                        <TableHead className="py-4 w-[60%]">Faixa de Área</TableHead>
                        <TableHead className="text-center py-4 w-[20%]">Qtd</TableHead>
                        <TableHead className="text-right py-4 w-[20%]">% Area</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const rangeTotalArea = data.range_details.reduce((acc, curr) => acc + curr.total_area, 0);
                        return data.range_details.map((item) => {
                          const percentage = rangeTotalArea > 0 ? (item.total_area / rangeTotalArea) * 100 : 0;
                          return (
                            <TableRow key={item.label} className="border-amber-500/10 hover:bg-amber-500/10 transition-colors">
                              <TableCell className="py-4 font-semibold">{item.label}</TableCell>
                              <TableCell className="text-center py-4 text-base">{item.count}</TableCell>
                              <TableCell className="text-right py-4 font-mono font-bold text-amber-600">
                                {percentage.toFixed(1)}%
                              </TableCell>
                            </TableRow>
                          );
                        });
                      })()}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Documentary Adherence Detailing */}
              <Card className="md:col-span-2 border-blue-500/20 bg-blue-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                    Parcelas com Aderência Documental
                  </CardTitle>
                  <CardDescription>
                    Comparação entre parcela certificada e CCIR para validação de área e titularidade.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-blue-500/10 border-blue-500/20 text-[10px] uppercase tracking-tighter">
                        <TableHead className="py-2 px-2 h-9">
                          <div className="flex items-center">
                            Parcela
                            <ColumnFilter 
                              title="Parcela" 
                              options={getUniqueValues(data.valid_details, "parcela_co")} 
                              selectedValues={validFilters.parcela_co} 
                              onFilterChange={(v) => setValidFilters({...validFilters, parcela_co: v})}
                            />
                          </div>
                        </TableHead>
                        <TableHead className="py-2 px-2 h-9">
                          <div className="flex items-center">
                            CCIR
                            <ColumnFilter 
                              title="CCIR" 
                              options={getUniqueValues(data.valid_details, "ccir")} 
                              selectedValues={validFilters.ccir} 
                              onFilterChange={(v) => setValidFilters({...validFilters, ccir: v})}
                            />
                          </div>
                        </TableHead>
                        <TableHead className="py-2 px-2 h-9">
                          <div className="flex items-center">
                            Matrícula
                            <ColumnFilter 
                              title="Matrícula" 
                              options={getUniqueValues(data.valid_details, "matricula")} 
                              selectedValues={validFilters.matricula} 
                              onFilterChange={(v) => setValidFilters({...validFilters, matricula: v})}
                            />
                          </div>
                        </TableHead>
                        <TableHead className="py-2 px-2 h-9">Município</TableHead>
                        <TableHead className="text-right py-2 px-2 h-9">Área SIGEF</TableHead>
                        <TableHead className="text-right py-2 px-2 h-9">Área SERPRO</TableHead>
                        <TableHead className="text-right py-2 px-2 h-9">Dif. (%)</TableHead>
                        <TableHead className="text-center py-2 px-2 h-9">
                          <div className="flex items-center justify-center">
                            Status
                            <ColumnFilter 
                              title="Status" 
                              options={getUniqueValues(data.valid_details, "atencao")} 
                              selectedValues={validFilters.atencao} 
                              onFilterChange={(v) => setValidFilters({...validFilters, atencao: v})}
                            />
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredValidDetails.length > 0 ? (
                        <>
                          {filteredValidDetails.map((item, idx) => (
                            <TableRow key={`${item.parcela_co}-${item.ccir}-${idx}`} className="border-blue-500/10 hover:bg-blue-500/10 transition-colors text-xs">
                              <TableCell className="py-3 px-2 font-mono">{item.parcela_co}</TableCell>
                              <TableCell className="py-3 px-2">{item.ccir}</TableCell>
                              <TableCell className="py-3 px-2">{item.matricula || "-"}</TableCell>
                              <TableCell className="py-3 px-2">{item.municipio}</TableCell>
                              <TableCell className="text-right py-3 px-2 font-mono">{formatArea(item.area_sigef)}</TableCell>
                              <TableCell className="text-right py-3 px-2 font-mono">{formatArea(item.area_serpro)}</TableCell>
                              <TableCell className="text-right py-3 px-2 font-mono">{item.diferenca.toFixed(1)}%</TableCell>
                              <TableCell className="text-center py-3 px-2">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                                  item.atencao === "OK" 
                                    ? "bg-emerald-500/20 text-emerald-600" 
                                    : "bg-destructive/20 text-destructive"
                                }`}>
                                  {item.atencao}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-blue-500/10 font-bold text-white border-t-2 border-blue-500/20 text-xs uppercase">
                            <TableCell colSpan={4} className="py-4 px-2 text-white">TOTAL VALIDADOS</TableCell>
                            <TableCell className="text-right py-4 px-2 font-mono text-white">
                              {formatArea(filteredValidDetails.reduce((acc, curr) => acc + curr.area_sigef, 0))}
                            </TableCell>
                            <TableCell className="text-right py-4 px-2 font-mono text-white">
                              {formatArea(filteredValidDetails.reduce((acc, curr) => acc + curr.area_serpro, 0))}
                            </TableCell>
                            <TableCell colSpan={2} className="py-4 px-2 text-center text-[10px] text-white font-normal lowercase">
                              {filteredValidDetails.length} parcela(s)
                            </TableCell>
                          </TableRow>
                        </>
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="py-8 text-center text-muted-foreground text-sm font-medium">
                            {data.valid_details.length > 0 ? "Nenhum resultado para os filtros selecionados." : "Nenhuma parcela com aderência documental encontrada para este CPF."}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Exclusive GEO Section with Potential Matches */}
            <Card className="border-destructive/20 bg-destructive/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <div className="w-8 h-8 rounded bg-destructive flex items-center justify-center text-destructive-foreground">
                    P
                  </div>
                  Correspondências Potenciais
                </CardTitle>
                <CardDescription className="text-white/60">
                  Parcelas sem validação estrita. Busca correspondecias entre parcela cerificada e CCIR
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-destructive/10 border-destructive/20 text-[10px] uppercase tracking-tighter">
                      <TableHead className="py-2 px-1 h-9 text-white">
                        <div className="flex items-center">
                          Parcela
                          <ColumnFilter 
                            title="Parcela" 
                            options={getUniqueValues(data.non_valid_geo, "parcela_co")} 
                            selectedValues={nonValidFilters.parcela_co} 
                            onFilterChange={(v) => setNonValidFilters({...nonValidFilters, parcela_co: v})}
                          />
                        </div>
                      </TableHead>
                      <TableHead className="py-2 px-1 h-9 text-white">
                        <div className="flex items-center">
                          CCIR (SGF)
                          <ColumnFilter 
                            title="CCIR SIGEF" 
                            options={getUniqueValues(data.non_valid_geo, "ccir_sigef")} 
                            selectedValues={nonValidFilters.ccir_sigef} 
                            onFilterChange={(v) => setNonValidFilters({...nonValidFilters, ccir_sigef: v})}
                          />
                        </div>
                      </TableHead>
                      <TableHead className="py-2 px-1 h-9 text-white">
                        <div className="flex items-center">
                          CCIR (SRP)
                          <ColumnFilter 
                            title="CCIR SERPRO" 
                            options={getUniqueValues(data.non_valid_geo, "ccir_serpro")} 
                            selectedValues={nonValidFilters.ccir_serpro} 
                            onFilterChange={(v) => setNonValidFilters({...nonValidFilters, ccir_serpro: v})}
                          />
                        </div>
                      </TableHead>
                      <TableHead className="py-2 px-1 h-9 text-white">
                        <div className="flex items-center">
                          Matr. (SGF)
                          <ColumnFilter 
                            title="Matrícula SIGEF" 
                            options={getUniqueValues(data.non_valid_geo, "matricula_sigef")} 
                            selectedValues={nonValidFilters.matricula_sigef} 
                            onFilterChange={(v) => setNonValidFilters({...nonValidFilters, matricula_sigef: v})}
                          />
                        </div>
                      </TableHead>
                      <TableHead className="py-2 px-1 h-9 text-white">
                        <div className="flex items-center">
                          Matr. (SRP)
                          <ColumnFilter 
                            title="Matrícula SERPRO" 
                            options={getUniqueValues(data.non_valid_geo, "matricula_serpro")} 
                            selectedValues={nonValidFilters.matricula_serpro} 
                            onFilterChange={(v) => setNonValidFilters({...nonValidFilters, matricula_serpro: v})}
                          />
                        </div>
                      </TableHead>
                      <TableHead className="text-right py-2 px-1 h-9 text-white">Área (SGF)</TableHead>
                      <TableHead className="text-right py-2 px-1 h-9 text-white">Área (SRP)</TableHead>
                      <TableHead className="text-center py-2 px-1 h-9 text-white">
                        <div className="flex items-center justify-center">
                          Vínculo
                          <ColumnFilter 
                            title="Vínculo" 
                            options={getUniqueValues(data.non_valid_geo, "match_type")} 
                            selectedValues={nonValidFilters.match_type} 
                            onFilterChange={(v) => setNonValidFilters({...nonValidFilters, match_type: v})}
                          />
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNonValidGeo.length > 0 ? (
                      <>
                        {filteredNonValidGeo.map((item) => (
                          <TableRow key={item.parcela_co} className="border-destructive/10 hover:bg-destructive/10 transition-colors text-xs text-white">
                            <TableCell className="py-3 px-1 font-mono text-white">{item.parcela_co}</TableCell>
                            <TableCell className="py-3 px-1 font-mono text-white">{item.ccir_sigef || "-"}</TableCell>
                            <TableCell className="py-3 px-1 font-mono text-white">{item.ccir_serpro || "-"}</TableCell>
                            <TableCell className="py-3 px-1 text-white">{item.matricula_sigef || "-"}</TableCell>
                            <TableCell className="py-3 px-1 text-white">{item.matricula_serpro || "-"}</TableCell>
                            <TableCell className="text-right py-3 px-1 font-mono text-white">{formatArea(item.area_sigef)} ha</TableCell>
                            <TableCell className="text-right py-3 px-1 font-mono text-white">
                              {item.area_serpro > 0 ? `${formatArea(item.area_serpro)} ha` : "-"}
                            </TableCell>
                            <TableCell className="text-center py-3 px-1">
                              {item.match_type ? (
                                item.match_type === 'SEM VINCULO' ? (
                                  <span className="px-2 py-1 rounded bg-red-500/20 text-red-400 font-bold text-[10px] uppercase border border-red-500/30">
                                    {item.match_type}
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px] uppercase border border-emerald-500/30">
                                    {item.match_type}
                                  </span>
                                )
                              ) : (
                                <span className="text-white opacity-50">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-destructive/10 font-bold border-t-2 border-destructive/20 text-white text-xs">
                          <TableCell colSpan={5} className="py-4 px-1 text-white uppercase tracking-wider">TOTAIS</TableCell>
                          <TableCell className="text-right py-4 px-1 font-mono text-white">
                            {formatArea(filteredNonValidGeo.reduce((acc, curr) => acc + curr.area_sigef, 0))} ha
                          </TableCell>
                          <TableCell className="text-right py-4 px-1 font-mono text-white">
                            {formatArea(filteredNonValidGeo.reduce((acc, curr) => acc + curr.area_serpro, 0))} ha
                          </TableCell>
                          <TableCell className="py-4 px-1 text-center text-[10px] text-white font-normal lowercase">
                            {filteredNonValidGeo.length} parcela(s)
                          </TableCell>
                        </TableRow>
                      </>
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-muted-foreground text-sm font-medium">
                          {data.non_valid_geo.length > 0 ? "Nenhum resultado para os filtros selecionados." : "Nenhuma correspondencia encontrada"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Patrimonial Analysis Section */}
            {landUseSummary.total > 0 && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl font-bold">
                    <PieChartIcon className="h-6 w-6 text-primary" />
                    Análise Patrimonial
                  </CardTitle>
                  <CardDescription>
                    Distribuição do uso do solo com base na área total das propriedades selecionadas ({formatArea(landUseSummary.total)} ha).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-12">
                  <div className="grid md:grid-cols-2 gap-8 items-center">
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: "Irrigação", value: landUseSummary.irrigacao, color: SOIL_COLORS.irrigacao },
                              { name: "Agricultura", value: landUseSummary.agricultura, color: SOIL_COLORS.agricultura },
                              { name: "Pastagem", value: landUseSummary.pastagem, color: SOIL_COLORS.pastagem },
                              { name: "Culturas Perm.", value: landUseSummary.culturas_permanentes, color: SOIL_COLORS.culturas_permanentes },
                              { name: "Reflorestamento", value: landUseSummary.reflorestamento, color: SOIL_COLORS.reflorestamento },
                              { name: "Mata/APP/Outros", value: landUseSummary.mata_app_outros, color: SOIL_COLORS.mata_app_outros },
                            ].filter(item => item.value > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {[
                              { name: "Irrigação", value: landUseSummary.irrigacao, color: SOIL_COLORS.irrigacao },
                              { name: "Agricultura", value: landUseSummary.agricultura, color: SOIL_COLORS.agricultura },
                              { name: "Pastagem", value: landUseSummary.pastagem, color: SOIL_COLORS.pastagem },
                              { name: "Culturas Perm.", value: landUseSummary.culturas_permanentes, color: SOIL_COLORS.culturas_permanentes },
                              { name: "Reflorestamento", value: landUseSummary.reflorestamento, color: SOIL_COLORS.reflorestamento },
                              { name: "Mata/APP/Outros", value: landUseSummary.mata_app_outros, color: SOIL_COLORS.mata_app_outros },
                            ].filter(item => item.value > 0).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => [`${formatArea(value)} ha`, "Área"]}
                            contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px", color: "#fff" }}
                          />
                          <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Detalhamento de Uso</h4>
                      <div className="grid gap-3">
                        {(() => {
                          const items = [
                            { id: 'irrigacao', label: "Área de Irrigação", value: landUseSummary.irrigacao, color: SOIL_COLORS.irrigacao },
                            { id: 'agricultura', label: "Área de Agricultura", value: landUseSummary.agricultura, color: SOIL_COLORS.agricultura },
                            { id: 'pastagem', label: "Área de Pastagem", value: landUseSummary.pastagem, color: SOIL_COLORS.pastagem },
                            { id: 'culturas_permanentes', label: "Culturas Permanentes", value: landUseSummary.culturas_permanentes, color: SOIL_COLORS.culturas_permanentes },
                            { id: 'reflorestamento', label: "Reflorestamento", value: landUseSummary.reflorestamento, color: SOIL_COLORS.reflorestamento },
                            { id: 'mata_app_outros', label: "Mata / APP / Outros", value: landUseSummary.mata_app_outros, color: SOIL_COLORS.mata_app_outros },
                          ].filter(item => item.value > 0);

                          const irrigacao = items.find(i => i.id === 'irrigacao');
                          const others = items.filter(i => i.id !== 'irrigacao').sort((a, b) => b.value - a.value);
                          
                          const sortedItems = irrigacao ? [...others, irrigacao] : others;

                          return sortedItems.map((item) => (
                            <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border">
                              <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="text-sm font-medium">{item.label}</span>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-mono font-bold">{formatArea(item.value)} ha</div>
                                <div className="text-[10px] text-muted-foreground">
                                  {((item.value / (landUseSummary.total || 1)) * 100).toFixed(1)}% do total
                                </div>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Patrimonial Value Highlights */}
                  <div className="flex flex-col items-center justify-center py-8 border-t border-primary/10 bg-primary/5 rounded-b-lg text-center">
                    <p className="text-sm text-muted-foreground uppercase tracking-widest mb-3 font-semibold">Valor Patrimonial Total Estimado </p>
                    <div className="flex flex-col md:flex-row items-center gap-6 md:gap-16">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-tighter">Mínimo</p>
                        <p className="text-4xl font-black font-mono text-white">{formatCurrency(landUseSummary.total_minimo)}</p>
                        <p className="text-sm text-muted-foreground mt-2 font-mono font-semibold bg-primary/10 py-1 px-3 rounded-full inline-block">
                          {formatCurrency(landUseSummary.total_minimo / (landUseSummary.total || 1))}/ha
                        </p>
                      </div>
                      <div className="hidden md:block h-24 w-px bg-primary/20" />
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-tighter">Máximo</p>
                        <p className="text-4xl font-black font-mono text-white">{formatCurrency(landUseSummary.total_maximo)}</p>
                        <p className="text-sm text-muted-foreground mt-2 font-mono font-semibold bg-primary/10 py-1 px-3 rounded-full inline-block">
                          {formatCurrency(landUseSummary.total_maximo / (landUseSummary.total || 1))}/ha
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="text-center">
              <Link href="/terminal">
                <Button variant="link" className="gap-2 text-primary hover:text-primary/80">
                  Explorar todos os dados brutos no Terminal SQL
                  <ArrowLeft className="h-4 w-4 rotate-180" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {!loading && !data && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed border-border rounded-xl">
            <Search className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">Insira um CPF ou CNPJ acima para gerar o relatório consolidado.</p>
            <p className="text-sm opacity-60">As bases CAR, SIGEF, SERPRO e Receita serão consultadas automaticamente.</p>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-12">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Database className="h-4 w-4" />
            <span>Agrogrid © 2026 - Inteligência Fundiária e Patrimonial</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Documentação</Link>
            <Link href="/terminal" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terminal SQL</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
