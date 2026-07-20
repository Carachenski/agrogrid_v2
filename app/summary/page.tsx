"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Database, ArrowLeft, Search, Loader2, FileText, CheckCircle, AlertCircle, MapPin, PieChart as PieChartIcon, Download, Trees, MapPinned, ScrollText, Landmark, ShieldCheck, ShieldAlert, ShieldX, ChevronDown, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import jsPDF from "jspdf";
import * as htmlToImage from "html-to-image";
import { StepNav } from "@/components/step-nav";
import { useConsulta } from "@/components/consulta-provider";
import type { SummaryData } from "@/lib/types";
import { type RiskLevel, getConsideredParcelas } from "@/lib/risk";

// Paleta padrão MapBiomas por classe de uso do solo
const SOIL_COLORS = {
  irrigacao: "#2532e4", // Água (MapBiomas) — azul p/ irrigação
  agricultura: "#E974ED", // Agricultura (MapBiomas)
  pastagem: "#edde8e", // Pastagem (MapBiomas)
  culturas_permanentes: "#d082de", // Lavoura Perene (MapBiomas)
  reflorestamento: "#7a5900", // Silvicultura (MapBiomas)
  mata_app_outros: "#1f8d49", // Formação Florestal (MapBiomas)
};

// Bases fundiárias consultadas automaticamente
const SOURCES = [
  { label: "CAR", desc: "Cadastro Ambiental Rural", icon: Trees },
  { label: "SIGEF", desc: "Georreferenciamento • INCRA", icon: MapPinned },
  { label: "SERPRO", desc: "CCIR • Cadastro Rural", icon: ScrollText },
  { label: "Receita Federal", desc: "CIB • Imóvel Rural", icon: Landmark },
];

// Máscara dinâmica de CPF (000.000.000-00) / CNPJ (00.000.000/0000-00)
function formatCpfCnpj(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

const RISK_LEVELS: {
  id: RiskLevel;
  label: string;
  desc: string;
  icon: typeof ShieldCheck;
  // classes aplicadas quando o nível está ativo / inativo
  active: string;
  iconColor: string;
}[] = [
  {
    id: "baixo",
    label: "Baixo Risco",
    desc: "Somente parcelas OK da aderência documental",
    icon: ShieldCheck,
    active: "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/40",
    iconColor: "text-emerald-500",
  },
  {
    id: "medio",
    label: "Médio Risco",
    desc: "Todas as parcelas da aderência documental",
    icon: ShieldAlert,
    active: "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/40",
    iconColor: "text-amber-500",
  },
  {
    id: "alto",
    label: "Alto Risco",
    desc: "Aderência + correspondências potenciais",
    icon: ShieldX,
    active: "border-red-500 bg-red-500/10 ring-1 ring-red-500/40",
    iconColor: "text-red-500",
  },
];

// Contagem de parcelas por nível (para exibir nos botões)
function countByRisk(data: SummaryData, risk: RiskLevel): number {
  return getConsideredParcelas(data, risk).size;
}

export default function SummaryPage() {
  // Estado da consulta vem do context (persiste entre as telas)
  const { cpf, setCpf, data, loading, error, riskLevel, setRiskLevel, fetchSummary } = useConsulta();
  const [exporting, setExporting] = useState(false);
  const [showAderencia, setShowAderencia] = useState(false);
  const [showCorrespondencia, setShowCorrespondencia] = useState(false);
  const [showMapaLista, setShowMapaLista] = useState(false);
  const [mapaFiltro, setMapaFiltro] = useState("");
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const parcelLayersRef = useRef<Record<string, any>>({});
  const fullBoundsRef = useRef<any>(null);

  useEffect(() => {
    if (data?.map_features && data.map_features.length > 0 && typeof window !== 'undefined') {
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
        parcelLayersRef.current = {};

        // Parcelas visíveis conforme o nível de risco selecionado
        const considered = getConsideredParcelas(data, riskLevel);
        const visibleFeatures = data.map_features.filter(
          (f) => f.geometry && considered.has(f.parcela_co)
        );
        const center = visibleFeatures[0] ?? data.map_features[0];

        const map = L.map(mapContainerRef.current).setView([center.lat, center.lng], 10);
        mapRef.current = map;

        const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        });

        // Imagem de satelite (Esri World Imagery, sem necessidade de API key)
        const satelliteLayer = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          {
            attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
            maxZoom: 19,
          }
        );

        // Rotulos (cidades, rodovias, fronteiras) sobrepostos a imagem de satelite
        const satelliteLabelsLayer = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
          {
            attribution: 'Labels &copy; Esri',
            maxZoom: 19,
          }
        );

        const satelliteGroup = L.layerGroup([satelliteLayer, satelliteLabelsLayer]);
        satelliteGroup.addTo(map);

        L.control
          .layers(
            { "Satélite": satelliteGroup, "Mapa": streetLayer },
            undefined,
            { position: 'topright', collapsed: true }
          )
          .addTo(map);

        // Desenha os limites (polígonos) das parcelas do nível de risco
        const features = visibleFeatures
          .map(f => ({
            type: "Feature",
            properties: {
              parcela_co: f.parcela_co,
              codigo_imo: f.codigo_imo,
              matricula: f.matricula,
              car: f.car,
            },
            geometry: f.geometry,
          }));

        const geoLayer = L.geoJSON(
          { type: "FeatureCollection", features },
          {
            style: {
              color: "#ef4444",      // perímetro vermelho
              weight: 2,
              fillColor: "#ef4444",
              fillOpacity: 0.15,
            },
            onEachFeature: (feature: any, layer: any) => {
              const p = feature.properties || {};
              if (p.parcela_co) parcelLayersRef.current[p.parcela_co] = layer;
              layer.bindPopup(
                `<div style="font-size:12px;line-height:1.4">
                   <strong>Parcela</strong><br/>${p.parcela_co || "-"}<br/><br/>
                   <strong>CCIR</strong><br/>${p.codigo_imo || "-"}<br/><br/>
                   <strong>Matrícula</strong><br/>${p.matricula || "-"}<br/><br/>
                   <strong>CAR</strong><br/>${p.car || "-"}
                 </div>`
              );
              layer.on("mouseover", () => layer.setStyle({ weight: 3, fillOpacity: 0.35 }));
              layer.on("mouseout", () => geoLayer.resetStyle(layer));
            },
          }
        ).addTo(map);

        const bounds = geoLayer.getBounds();
        fullBoundsRef.current = bounds;
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [30, 30] });
        }
      };

      loadMap();
    }
  }, [data, riskLevel]);

  // Recalcula o tamanho do mapa ao expandir/recolher a lista lateral
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const t = setTimeout(() => map.invalidateSize(), 220);
    return () => clearTimeout(t);
  }, [showMapaLista]);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!cpf.trim()) return;
    // Reseta o estado de visualização da tela e dispara a consulta no context
    // (o riskLevel é resetado para "alto" dentro do fetchSummary do context)
    setShowAderencia(false);
    setShowCorrespondencia(false);
    setShowMapaLista(false);
    setMapaFiltro("");
    fetchSummary(cpf);
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

    // Expande as tabelas recolhidas para saírem completas no PDF, restaurando depois
    const prevShowAderencia = showAderencia;
    const prevShowCorrespondencia = showCorrespondencia;
    setShowAderencia(true);
    setShowCorrespondencia(true);

    setExporting(true);
    try {
      const element = contentRef.current;

      // Injetar estilo para esconder scrollbars e fixar dimensões
      const hideScrollStyle = document.createElement("style");
      hideScrollStyle.innerHTML = `
        ::-webkit-scrollbar { display: none !important; }
        * { scrollbar-width: none !important; }
        .pdf-capture-fix .leaflet-container { width: 1100px !important; height: 400px !important; }
        .leaflet-control-layers { display: none !important; }
        .map-side-list { display: none !important; }
        .map-grid { display: block !important; }
      `;
      document.head.appendChild(hideScrollStyle);

      // Pequeno delay para renderização
      await new Promise(resolve => setTimeout(resolve, 600));

      // Gera a imagem do conteúdo total. O botão de exportar (e qualquer
      // elemento .export-hide-on-pdf) é excluído da captura via filter,
      // mantendo-o visível na tela com o estado "Gerando PDF...".
      const canvas = await htmlToImage.toCanvas(element, {
        pixelRatio: 2,
        backgroundColor: "#030712",
        width: 1200,
        filter: (node) =>
          !(node instanceof HTMLElement && node.classList?.contains("export-hide-on-pdf")),
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
      // Restaura o estado de recolhimento das tabelas
      setShowAderencia(prevShowAderencia);
      setShowCorrespondencia(prevShowCorrespondencia);
    }
  };

  // Tabelas mostram sempre todas as linhas (sem filtros de coluna)
  const filteredValidDetails = data?.valid_details ?? [];
  const filteredNonValidGeo = data?.non_valid_geo ?? [];

  // Parcelas consideradas conforme o nível de risco selecionado
  const consideredParcelas = data ? getConsideredParcelas(data, riskLevel) : new Set<string>();

  // Análise Patrimonial usa apenas as parcelas do nível de risco
  const filteredLandUse = data?.land_use_details.filter(item => consideredParcelas.has(item.parcela_co)) || [];

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

  // Composição do uso do solo (fonte única p/ gráfico e detalhamento)
  const soilItems = [
    { id: "irrigacao", label: "Irrigação", value: landUseSummary.irrigacao, color: SOIL_COLORS.irrigacao },
    { id: "agricultura", label: "Agricultura", value: landUseSummary.agricultura, color: SOIL_COLORS.agricultura },
    { id: "pastagem", label: "Pastagem", value: landUseSummary.pastagem, color: SOIL_COLORS.pastagem },
    { id: "culturas_permanentes", label: "Culturas Permanentes", value: landUseSummary.culturas_permanentes, color: SOIL_COLORS.culturas_permanentes },
    { id: "reflorestamento", label: "Reflorestamento", value: landUseSummary.reflorestamento, color: SOIL_COLORS.reflorestamento },
    { id: "mata_app_outros", label: "Mata / APP / Outros", value: landUseSummary.mata_app_outros, color: SOIL_COLORS.mata_app_outros },
  ].filter(item => item.value > 0);

  // Ordena por área (maiores primeiro), mantendo Irrigação por último
  const soilIrrig = soilItems.find(i => i.id === "irrigacao");
  const soilOthers = soilItems.filter(i => i.id !== "irrigacao").sort((a, b) => b.value - a.value);
  const soilSorted = soilIrrig ? [...soilOthers, soilIrrig] : soilOthers;

  const carTotalArea = data?.summary.find(s => s.table === "car_prop")?.total_area || 0;
  const geoTotalArea = data?.summary.find(s => s.table === "sigef_prop")?.total_area || 0;
  const ccirTotalArea = data?.ccir_details?.[0]?.total_area || 0;
  const cibBaseArea = data?.cib_details?.[0]?.total_area || 0;

  // Valores do CCIR reaproveitados na tabela "Distribuição Geral"
  const ccirDetencaoArea = data?.ccir_details?.find(d => d.label === "Detenção do Titular")?.total_area ?? 0;
  const ccirMatriculaCount = data?.ccir_details?.find(d => d.label === "Matrícula")?.count ?? 0;
  // Matrículas do GEO (SIGEF): parcelas com registro_m preenchido
  const geoMatriculaCount = data?.geo_details?.find(d => d.label === "Matrículas")?.count ?? 0;

  // Info por parcela (município/área) para a lista lateral navegável do mapa
  const mapParcelInfo: Record<string, { municipio: string; uf: string; area: number }> = {};
  if (data) {
    data.valid_details.forEach((d) => {
      mapParcelInfo[d.parcela_co] = { municipio: d.municipio || "—", uf: "", area: d.area_sigef };
    });
    data.non_valid_geo.forEach((d) => {
      if (!mapParcelInfo[d.parcela_co])
        mapParcelInfo[d.parcela_co] = { municipio: d.municipio || "—", uf: d.uf || "", area: d.area_sigef };
    });
  }
  // Normaliza município (sem acento/maiúsculas) só para agrupar; rótulo prefere versão acentuada
  const semAcento = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
  const normMun = (s: string) => semAcento(s).toUpperCase().trim();
  const temAcento = (s: string) => s !== semAcento(s);

  // Parcelas do mapa agrupadas por município (ordenadas por qtd de parcelas)
  type MapaParcela = { parcela_co: string; area: number; matricula: string | null };
  const mapGrupos: { label: string; parcelas: MapaParcela[]; area: number }[] = data
    ? (Object.values(
        data.map_features
          .filter((f) => consideredParcelas.has(f.parcela_co))
          .reduce((acc: Record<string, any>, f) => {
          const info = mapParcelInfo[f.parcela_co];
          const raw = info?.municipio || "Sem município";
          const key = normMun(raw) || "SEM MUNICIPIO";
          if (!acc[key]) acc[key] = { label: raw, parcelas: [], area: 0 };
          else if (temAcento(raw) && !temAcento(acc[key].label)) acc[key].label = raw;
          acc[key].parcelas.push({ parcela_co: f.parcela_co, area: info?.area || 0, matricula: f.matricula });
          acc[key].area += info?.area || 0;
          return acc;
        }, {})
      ) as any[]).sort((a, b) => b.parcelas.length - a.parcelas.length || b.area - a.area)
    : [];

  // Filtro por matrícula na lista lateral
  const mapaFiltroLc = mapaFiltro.trim().toLowerCase();
  const mapGruposFiltrados = mapaFiltroLc
    ? mapGrupos
        .map((g) => ({
          ...g,
          parcelas: g.parcelas.filter((p) => (p.matricula || "").toLowerCase().includes(mapaFiltroLc)),
        }))
        .filter((g) => g.parcelas.length > 0)
    : mapGrupos;

  // Navegação do mapa: voar até uma parcela / conjunto de parcelas / todas
  const flyToParcela = (parcelaCo: string) => {
    const map = mapRef.current;
    const layer = parcelLayersRef.current[parcelaCo];
    if (!map || !layer) return;
    map.flyToBounds(layer.getBounds(), { maxZoom: 15, padding: [40, 40] });
    layer.openPopup();
    mapContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const flyToParcelas = (parcelasCo: string[]) => {
    const map = mapRef.current;
    const L = (window as any).L;
    if (!map || !L) return;
    let bounds: any = null;
    parcelasCo.forEach((pc) => {
      const layer = parcelLayersRef.current[pc];
      if (!layer) return;
      bounds = bounds ? bounds.extend(layer.getBounds()) : L.latLngBounds(layer.getBounds());
    });
    if (bounds) map.flyToBounds(bounds, { padding: [40, 40] });
    mapContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const flyToTodas = () => {
    const map = mapRef.current;
    if (map && fullBoundsRef.current?.isValid?.()) {
      map.flyToBounds(fullBoundsRef.current, { padding: [30, 30] });
    }
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Navegação sequencial */}
      <StepNav />

      {/* Hero / Search */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-card to-background">
        {/* brilho decorativo */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
          <div className="h-72 w-[46rem] max-w-full rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="relative max-w-3xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-10">
            Inteligência Fundiária &amp; Patrimonial
          </div>

          <form onSubmit={handleSearch} className="mx-auto max-w-xl">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-lg shadow-black/20 transition focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Digite o CPF ou CNPJ"
                  value={cpf}
                  onChange={(e) => setCpf(formatCpfCnpj(e.target.value))}
                  className="h-11 border-0 bg-transparent pl-10 text-base shadow-none focus-visible:ring-0"
                  maxLength={18}
                  inputMode="numeric"
                  autoFocus
                />
              </div>
              <Button type="submit" size="lg" disabled={loading || !cpf} className="h-11 shrink-0 gap-2 px-6">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Consultar
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* chips das bases consultadas */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {SOURCES.map((s) => (
              <span
                key={s.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs text-muted-foreground"
              >
                <s.icon className="h-3.5 w-3.5 text-primary/70" />
                {s.label}
              </span>
            ))}
          </div>
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
                <CardHeader className="pb-2 text-center">
                  <CardDescription>CPF ou CNPJ Consultado</CardDescription>
                  <CardTitle className="text-2xl font-mono">{data.cpf}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2 text-center">
                  <CardDescription>Nome do Titular / Detentor</CardDescription>
                  <CardTitle className="text-2xl uppercase">{data.detentor}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Map Section */}
            {data.map_features && data.map_features.length > 0 && (
              <Card className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <MapPin className="h-5 w-5 text-primary" />
                        Localização das Propriedades
                      </CardTitle>
                      <CardDescription className="mt-1.5">
                        Limites das parcelas registradas para este CPF.
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 export-hide-on-pdf"
                      onClick={() => setShowMapaLista((v) => !v)}
                    >
                      <Search className="h-4 w-4" />
                      Encontrar parcelas
                      <ChevronDown className={cn("h-4 w-4 transition-transform", showMapaLista && "rotate-180")} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className={cn("map-grid grid", showMapaLista && "lg:grid-cols-[1fr_320px]")}>
                    <div
                      ref={mapContainerRef}
                      className="h-[420px] w-full bg-muted relative z-0 lg:h-[540px]"
                      style={{ minHeight: "420px" }}
                    />
                    {/* Lista lateral navegável (recolhível) */}
                    {showMapaLista && (
                      <div className="map-side-list flex max-h-[540px] flex-col border-t border-border lg:border-l lg:border-t-0">
                        <div className="flex items-center justify-between border-b border-border px-3 py-2">
                          <span className="text-sm font-medium text-foreground">
                            {mapGrupos.reduce((n, g) => n + g.parcelas.length, 0)} parcela
                            {mapGrupos.reduce((n, g) => n + g.parcelas.length, 0) !== 1 ? "s" : ""}
                          </span>
                          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={flyToTodas}>
                            <Maximize2 className="h-3.5 w-3.5" />
                            Ver todas
                          </Button>
                        </div>
                        <div className="border-b border-border p-2">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              value={mapaFiltro}
                              onChange={(e) => setMapaFiltro(e.target.value)}
                              placeholder="Buscar matrícula..."
                              className="h-8 pl-8 text-xs"
                            />
                          </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                          {mapGruposFiltrados.map((g) => (
                            <div key={g.label}>
                              <button
                                type="button"
                                onClick={() => flyToParcelas(g.parcelas.map((p) => p.parcela_co))}
                                className="sticky top-0 flex w-full items-center justify-between gap-2 bg-muted/70 px-3 py-2 text-left backdrop-blur-sm transition-colors hover:bg-muted"
                              >
                                <span className="flex items-center gap-1.5 truncate text-xs font-semibold uppercase text-foreground">
                                  <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                                  {g.label.toUpperCase()}
                                </span>
                                <span className="shrink-0 text-[11px] text-muted-foreground">
                                  {g.parcelas.length} · {formatArea(g.area)} ha
                                </span>
                              </button>
                              {g.parcelas.map((p) => (
                                <button
                                  key={p.parcela_co}
                                  type="button"
                                  onClick={() => flyToParcela(p.parcela_co)}
                                  className="flex w-full items-center justify-between gap-2 border-b border-border/40 px-3 py-1.5 text-left transition-colors hover:bg-primary/10"
                                >
                                  <span className="flex min-w-0 items-center gap-1.5">
                                    <span className="text-[10px] uppercase text-muted-foreground">Matr.</span>
                                    <span className="truncate font-mono text-xs text-foreground">{p.matricula || "—"}</span>
                                  </span>
                                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                                    {formatArea(p.area)} ha
                                  </span>
                                </button>
                              ))}
                            </div>
                          ))}
                          {mapGruposFiltrados.length === 0 && (
                            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                              Nenhuma matrícula encontrada.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
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
                      <TableHead className="text-center py-4 w-[24%]">Origem dos Dados</TableHead>
                      <TableHead className="text-center py-4 w-[13%]">Quantidade</TableHead>
                      <TableHead className="text-center py-4 w-[23%]">Area Total (ha)</TableHead>
                      <TableHead className="text-center py-4 w-[25%]">Detenção do Titular (ha)</TableHead>
                      <TableHead className="text-center py-4 w-[15%]">Matrículas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.summary.map((row) => {
                      const isCcir = row.table === "serpro_prop";
                      const isGeo = row.table === "sigef_prop";
                      return (
                        <TableRow key={row.table} className="hover:bg-muted/20 transition-colors">
                          <TableCell className="text-center py-4">
                            <div className="font-semibold text-foreground">{row.label}</div>
                          </TableCell>
                          <TableCell className="text-center py-4">
                            <span className="text-base font-medium">{row.count}</span>
                          </TableCell>
                          <TableCell className="text-center py-4">
                            <span className="text-base font-mono font-medium">{formatArea(row.total_area)}</span>
                          </TableCell>
                          <TableCell className="text-center py-4">
                            {isCcir ? (
                              <span className="text-base font-mono font-medium">{formatArea(ccirDetencaoArea)}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center py-4">
                            {isCcir ? (
                              <span className="text-base font-medium">{ccirMatriculaCount}</span>
                            ) : isGeo ? (
                              <span className="text-base font-medium">{geoMatriculaCount}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Detailings Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Municipality Detailing */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold">
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
                      <TableRow className="bg-muted/30">
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
                            <TableRow key={`${item.municipio}-${item.uf}`} className="hover:bg-muted/20 transition-colors">
                              <TableCell className="py-4 font-semibold">{item.municipio} - {item.uf}</TableCell>
                              <TableCell className="text-center py-4 text-base">{item.count}</TableCell>
                              <TableCell className="text-right py-4 font-mono text-base">{formatArea(item.total_area)}</TableCell>
                              <TableCell className="text-right py-4 font-mono font-bold text-primary">
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold">
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
                      <TableRow className="bg-muted/30">
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
                            <TableRow key={item.label} className="hover:bg-muted/20 transition-colors">
                              <TableCell className="py-4 font-semibold">{item.label}</TableCell>
                              <TableCell className="text-center py-4 text-base">{item.count}</TableCell>
                              <TableCell className="text-right py-4 font-mono font-bold text-primary">
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
              <Card className="md:col-span-2">
                <CardHeader
                  role="button"
                  tabIndex={0}
                  onClick={() => setShowAderencia((v) => !v)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setShowAderencia((v) => !v);
                    }
                  }}
                  className="cursor-pointer select-none"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-primary" />
                        Parcelas com Aderência Documental
                      </CardTitle>
                      <CardDescription className="mt-1.5">
                        Comparação entre parcela certificada e CCIR para validação de área e titularidade.
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                      <span className="hidden sm:inline">{filteredValidDetails.length} parcela(s)</span>
                      <ChevronDown className={cn("h-5 w-5 transition-transform", showAderencia && "rotate-180")} />
                    </div>
                  </div>
                </CardHeader>
                {showAderencia && (
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 text-[10px] uppercase tracking-tighter">
                        <TableHead className="py-2 px-2 h-9">Parcela</TableHead>
                        <TableHead className="py-2 px-2 h-9">CCIR</TableHead>
                        <TableHead className="py-2 px-2 h-9">Matrícula</TableHead>
                        <TableHead className="py-2 px-2 h-9">Município</TableHead>
                        <TableHead className="text-right py-2 px-2 h-9">Área SIGEF</TableHead>
                        <TableHead className="text-right py-2 px-2 h-9">Área SERPRO</TableHead>
                        <TableHead className="text-right py-2 px-2 h-9">Dif. (%)</TableHead>
                        <TableHead className="text-center py-2 px-2 h-9">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredValidDetails.length > 0 ? (
                        <>
                          {filteredValidDetails.map((item, idx) => (
                            <TableRow key={`${item.parcela_co}-${item.ccir}-${idx}`} className="hover:bg-muted/20 transition-colors text-xs">
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
                          <TableRow className="bg-muted/40 font-bold border-t-2 border-border text-xs uppercase">
                            <TableCell colSpan={4} className="py-4 px-2">TOTAL VALIDADOS</TableCell>
                            <TableCell className="text-right py-4 px-2 font-mono">
                              {formatArea(filteredValidDetails.reduce((acc, curr) => acc + curr.area_sigef, 0))}
                            </TableCell>
                            <TableCell className="text-right py-4 px-2 font-mono">
                              {formatArea(filteredValidDetails.reduce((acc, curr) => acc + curr.area_serpro, 0))}
                            </TableCell>
                            <TableCell colSpan={2} className="py-4 px-2 text-center text-[10px] text-muted-foreground font-normal lowercase">
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
                )}
              </Card>
            </div>

            {/* Exclusive GEO Section with Potential Matches */}
            <Card>
              <CardHeader
                role="button"
                tabIndex={0}
                onClick={() => setShowCorrespondencia((v) => !v)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setShowCorrespondencia((v) => !v);
                  }
                }}
                className="cursor-pointer select-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-primary" />
                      Correspondências Potenciais
                    </CardTitle>
                    <CardDescription className="text-muted-foreground mt-1.5">
                      Parcelas sem validação estrita. Busca correspondecias entre parcela cerificada e CCIR
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                    <span className="hidden sm:inline">{filteredNonValidGeo.length} parcela(s)</span>
                    <ChevronDown className={cn("h-5 w-5 transition-transform", showCorrespondencia && "rotate-180")} />
                  </div>
                </div>
              </CardHeader>
              {showCorrespondencia && (
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 text-[10px] uppercase tracking-tighter">
                      <TableHead className="py-2 px-1 h-9">Parcela</TableHead>
                      <TableHead className="py-2 px-1 h-9">CCIR (SGF)</TableHead>
                      <TableHead className="py-2 px-1 h-9">CCIR (SRP)</TableHead>
                      <TableHead className="py-2 px-1 h-9">Matr. (SGF)</TableHead>
                      <TableHead className="py-2 px-1 h-9">Matr. (SRP)</TableHead>
                      <TableHead className="text-right py-2 px-1 h-9">Área (SGF)</TableHead>
                      <TableHead className="text-right py-2 px-1 h-9">Área (SRP)</TableHead>
                      <TableHead className="text-center py-2 px-1 h-9">Vínculo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNonValidGeo.length > 0 ? (
                      <>
                        {filteredNonValidGeo.map((item) => (
                          <TableRow key={item.parcela_co} className="hover:bg-muted/20 transition-colors text-xs">
                            <TableCell className="py-3 px-1 font-mono">{item.parcela_co}</TableCell>
                            <TableCell className="py-3 px-1 font-mono">{item.ccir_sigef || "-"}</TableCell>
                            <TableCell className="py-3 px-1 font-mono">{item.ccir_serpro || "-"}</TableCell>
                            <TableCell className="py-3 px-1">{item.matricula_sigef || "-"}</TableCell>
                            <TableCell className="py-3 px-1">{item.matricula_serpro || "-"}</TableCell>
                            <TableCell className="text-right py-3 px-1 font-mono">{formatArea(item.area_sigef)} ha</TableCell>
                            <TableCell className="text-right py-3 px-1 font-mono">
                              {item.area_serpro > 0 ? `${formatArea(item.area_serpro)} ha` : "-"}
                            </TableCell>
                            <TableCell className="text-center py-3 px-1">
                              {item.match_type ? (
                                item.match_type === 'SEM VINCULO' ? (
                                  <span className="px-2 py-1 rounded bg-red-500/20 text-red-400 font-bold text-[10px] uppercase border border-red-500/30">
                                    {item.match_type}
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-600 font-bold text-[10px] uppercase border border-emerald-500/30">
                                    {item.match_type}
                                  </span>
                                )
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/40 font-bold border-t-2 border-border text-xs">
                          <TableCell colSpan={5} className="py-4 px-1 uppercase tracking-wider">TOTAIS</TableCell>
                          <TableCell className="text-right py-4 px-1 font-mono">
                            {formatArea(filteredNonValidGeo.reduce((acc, curr) => acc + curr.area_sigef, 0))} ha
                          </TableCell>
                          <TableCell className="text-right py-4 px-1 font-mono">
                            {formatArea(filteredNonValidGeo.reduce((acc, curr) => acc + curr.area_serpro, 0))} ha
                          </TableCell>
                          <TableCell className="py-4 px-1 text-center text-[10px] text-muted-foreground font-normal lowercase">
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
              )}
            </Card>

            {/* Nível de Risco + Análise Patrimonial agrupados (espaçamento menor p/ caberem juntos) */}
            <div className="space-y-6">
            {/* Filtro de Nível de Risco */}
            <Card>
              <CardHeader className="py-4 text-center">
                <CardTitle className="flex items-center justify-center gap-2 text-lg font-bold">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Nível de Risco Fundiário
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="grid gap-2.5 sm:grid-cols-3">
                  {RISK_LEVELS.map((r) => {
                    const Icon = r.icon;
                    const isActive = riskLevel === r.id;
                    const count = data ? countByRisk(data, r.id) : 0;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRiskLevel(r.id)}
                        aria-pressed={isActive}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border px-5 py-4 text-left transition-colors",
                          isActive
                            ? r.active
                            : "border-border bg-background/40 hover:border-foreground/20 hover:bg-secondary/40"
                        )}
                      >
                        <Icon className={cn("h-7 w-7 shrink-0", isActive ? r.iconColor : "text-muted-foreground")} />
                        <div className="min-w-0 flex-1">
                          <div className="text-base font-semibold text-foreground">{r.label}</div>
                          <div className="text-xs leading-tight text-muted-foreground">
                            {count} parcela{count !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Patrimonial Analysis Section */}
            {landUseSummary.total > 0 && (
              <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-transparent overflow-hidden">
                <CardHeader className="py-4">
                  <CardTitle className="flex items-center gap-2 text-lg font-bold">
                    <PieChartIcon className="h-5 w-5 text-primary" />
                    Análise Patrimonial
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pb-5">
                  <div className="grid lg:grid-cols-2 gap-6 items-center">
                    {/* Donut com total no centro */}
                    <div className="relative h-[210px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={soilItems}
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={76}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="none"
                          >
                            {soilItems.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number) => [`${formatArea(value)} ha`, "Área"]}
                            contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px", color: "#fff" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</span>
                        <span className="font-mono text-xl font-bold text-foreground">{formatArea(landUseSummary.total)}</span>
                        <span className="text-[10px] text-muted-foreground">hectares</span>
                      </div>
                    </div>

                    {/* Detalhamento com barras de proporção */}
                    <div>
                      <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Detalhamento de Uso
                      </h4>
                      <div className="space-y-2">
                        {soilSorted.map((item) => {
                          const pct = (item.value / (landUseSummary.total || 1)) * 100;
                          return (
                            <div key={item.id} className="space-y-1.5">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">{item.label}</span>
                                <div className="flex items-baseline gap-2">
                                  <span className="font-mono font-semibold">{formatArea(item.value)} ha</span>
                                  <span className="w-11 text-right text-xs text-muted-foreground">{pct.toFixed(1)}%</span>
                                </div>
                              </div>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{ width: `${pct}%`, backgroundColor: item.color }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Valor Patrimonial Estimado */}
                  <div className="border-t border-primary/10 pt-5">
                    <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                      Valor Patrimonial Total Estimado
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border border-border bg-background/50 p-4 text-center">
                        <p className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">Mínimo</p>
                        <p className="font-mono text-2xl font-black text-foreground md:text-3xl">
                          {formatCurrency(landUseSummary.total_minimo)}
                        </p>
                        <p className="mt-2 inline-block rounded-full bg-secondary px-3 py-0.5 font-mono text-xs text-muted-foreground">
                          {formatCurrency(landUseSummary.total_minimo / (landUseSummary.total || 1))}/ha
                        </p>
                      </div>
                      <div className="rounded-xl border border-border bg-background/50 p-4 text-center">
                        <p className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">Máximo</p>
                        <p className="font-mono text-2xl font-black text-foreground md:text-3xl">
                          {formatCurrency(landUseSummary.total_maximo)}
                        </p>
                        <p className="mt-2 inline-block rounded-full bg-secondary px-3 py-0.5 font-mono text-xs text-muted-foreground">
                          {formatCurrency(landUseSummary.total_maximo / (landUseSummary.total || 1))}/ha
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            </div>

            <div className="text-center export-hide-on-pdf">
              <Button
                onClick={handleExportPDF}
                disabled={exporting}
                variant="secondary"
                size="lg"
                className="gap-2"
              >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {exporting ? "Gerando PDF..." : "Exportar PDF"}
              </Button>
            </div>
          </div>
        )}

        {!loading && !data && !error && (
          <div className="mx-auto max-w-3xl">
            <div className="rounded-2xl border border-dashed border-border bg-card/30 px-6 py-14 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Search className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Comece por um CPF ou CNPJ</h3>
              <p className="mx-auto mb-10 max-w-md text-sm text-muted-foreground">
                Insira um documento no campo acima para gerar o relatório consolidado. Estas são as
                bases consultadas automaticamente:
              </p>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {SOURCES.map((s) => (
                  <div
                    key={s.label}
                    className="flex flex-col items-center gap-2 rounded-xl border border-border bg-background/50 px-3 py-5 transition-colors hover:border-primary/30"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <s.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-sm font-semibold text-foreground">{s.label}</div>
                    <div className="text-[11px] leading-tight text-muted-foreground">{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>
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
            <Link href="/socioambiental" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Socioambiental</Link>
            <Link href="/producao" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Quadro de Produção</Link>
            <Link href="/score" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Score</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
