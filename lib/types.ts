export interface SummaryItem {
  table: string;
  label: string;
  count: number;
  total_area: number;
}

export interface SummaryData {
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
    ccir_sigef: string;
    ccir_serpro: string;
    area_sigef: number;
    area_serpro: number;
    diferenca: number;
    atencao: string;
    municipio: string;
    matricula_serpro: string;
    matricula_sigef: string;
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
  map_features: {
    id: number;
    parcela_co: string;
    codigo_imo: string;
    matricula: string | null;
    car: string;
    lat: number;
    lng: number;
    geometry: any;
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
