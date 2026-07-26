import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  host: process.env.DB_HOST || "host.docker.internal",
  database: process.env.DB_NAME || "postgres",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  port: parseInt(process.env.DB_PORT || "5433"),
});

type BaseRow = {
  cultura: string;
  safra: string;
  area: string | null;
  preco: string | null;
  produtividade: string | null;
  custo_ha: string | null;
  receita_bruta: string | null;
  custo_total: string | null;
  custo_arrenda_total: string | null;
  resultado: string | null;
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({} as any));
  const cpf: string | undefined = body?.cpf;
  const parcelas: unknown = body?.parcelas;

  if (!cpf) {
    return NextResponse.json({ error: "CPF é obrigatório" }, { status: 400 });
  }

  // Quando `parcelas` é uma lista, filtramos o histórico pelas parcelas
  // consideradas no nível de risco fundiário escolhido.
  const filtrarParcelas = Array.isArray(parcelas);
  const whereParcelas = filtrarParcelas ? " AND h.parcela_co = ANY($2::text[])" : "";
  const params: any[] = filtrarParcelas ? [cpf, parcelas] : [cpf];

  try {
    // rentabilidade deduplicada por (cultura, regiao, safra) — a planilha milho1
    // traz 2 linhas por chave; usamos a média para não duplicar no join.
    // Receita bruta = area * preço * produtividade | Custo = area * custo/ha
    // Resultado (margem líquida) = area * rentabilidade/ha
    const res = await pool.query<BaseRow>(
      `WITH rent AS (
         SELECT cultura, regiao, safra,
                AVG(rentabilidade) AS rentabilidade,
                AVG(preco)         AS preco,
                AVG(produtividade) AS produtividade,
                AVG(custo)         AS custo,
                AVG(COALESCE(custo_arrenda, custo)) AS custo_arrenda
         FROM rentabilidade
         GROUP BY cultura, regiao, safra
       )
       SELECT
         h.cultura,
         h.safra,
         h.area,
         r.preco,
         r.produtividade,
         r.custo AS custo_ha,
         (h.area * r.preco * r.produtividade) AS receita_bruta,
         (h.area * r.custo)                   AS custo_total,
         (h.area * r.custo_arrenda)           AS custo_arrenda_total,
         (h.area * r.rentabilidade)           AS resultado
       FROM historico_safra h
       LEFT JOIN rent r
         ON r.cultura = h.cultura
        AND r.regiao  = h.nome_rg_ag
        AND r.safra   = h.safra
       WHERE h.cpf_cnpj = $1${whereParcelas}
         AND h.cultura NOT IN ('pastagem', 'irrigacao')`,
      params
    );

    const rows = res.rows.map((r) => ({
      cultura: r.cultura,
      safra: r.safra,
      area: parseFloat(r.area || "0"),
      preco: r.preco != null ? parseFloat(r.preco) : null,
      produtividade: r.produtividade != null ? parseFloat(r.produtividade) : null,
      custo_ha: r.custo_ha != null ? parseFloat(r.custo_ha) : null,
      receita_bruta: r.receita_bruta != null ? parseFloat(r.receita_bruta) : 0,
      custo_total: r.custo_total != null ? parseFloat(r.custo_total) : 0,
      custo_arrenda_total: r.custo_arrenda_total != null ? parseFloat(r.custo_arrenda_total) : 0,
      resultado: r.resultado != null ? parseFloat(r.resultado) : 0,
    }));

    // --- Agregação por cultura + safra (quadro detalhado) ---
    const mapCS = new Map<string, any>();
    for (const r of rows) {
      const key = `${r.cultura}||${r.safra}`;
      let acc = mapCS.get(key);
      if (!acc) {
        acc = {
          cultura: r.cultura,
          safra: r.safra,
          area: 0,
          area_prod: 0, // área com produtividade (p/ média ponderada)
          prod_x_area: 0,
          area_preco: 0,
          preco_x_area: 0,
          area_custo: 0,
          receita_bruta: 0,
          custo_total: 0,
          custo_arrenda_total: 0,
          resultado: 0,
        };
        mapCS.set(key, acc);
      }
      acc.area += r.area;
      acc.receita_bruta += r.receita_bruta;
      acc.custo_total += r.custo_total;
      acc.custo_arrenda_total += r.custo_arrenda_total;
      acc.resultado += r.resultado;
      if (r.produtividade != null) {
        acc.area_prod += r.area;
        acc.prod_x_area += r.produtividade * r.area;
      }
      if (r.preco != null) {
        acc.area_preco += r.area;
        acc.preco_x_area += r.preco * r.area;
      }
      if (r.custo_ha != null) acc.area_custo += r.area;
    }

    const linhas = Array.from(mapCS.values())
      .map((a) => ({
        cultura: a.cultura,
        safra: a.safra,
        area: a.area,
        produtividade: a.area_prod > 0 ? a.prod_x_area / a.area_prod : null,
        preco: a.area_preco > 0 ? a.preco_x_area / a.area_preco : null,
        receita_bruta: a.receita_bruta,
        custo_total: a.custo_total,
        custo_arrenda_total: a.custo_arrenda_total,
        resultado: a.resultado,
      }))
      .sort((x, y) => (y.safra.localeCompare(x.safra) || x.cultura.localeCompare(y.cultura)));

    // --- Fluxo de caixa por safra ---
    const mapS = new Map<string, any>();
    for (const r of rows) {
      let acc = mapS.get(r.safra);
      if (!acc) {
        acc = { safra: r.safra, area: 0, receita_bruta: 0, custo_total: 0, custo_arrenda_total: 0, resultado: 0 };
        mapS.set(r.safra, acc);
      }
      acc.area += r.area;
      acc.receita_bruta += r.receita_bruta;
      acc.custo_total += r.custo_total;
      acc.custo_arrenda_total += r.custo_arrenda_total;
      acc.resultado += r.resultado;
    }
    const por_safra = Array.from(mapS.values()).sort((a, b) => a.safra.localeCompare(b.safra));

    // --- Totais ---
    const totais = rows.reduce(
      (t, r) => {
        t.area += r.area;
        t.receita_bruta += r.receita_bruta;
        t.custo_total += r.custo_total;
        t.custo_arrenda_total += r.custo_arrenda_total;
        t.resultado += r.resultado;
        return t;
      },
      { area: 0, receita_bruta: 0, custo_total: 0, custo_arrenda_total: 0, resultado: 0 }
    );

    const safras = por_safra.map((s) => s.safra);
    const culturas = Array.from(new Set(rows.map((r) => r.cultura))).sort();

    return NextResponse.json({
      cpf,
      safras,
      culturas,
      linhas,
      por_safra,
      totais,
    });
  } catch (error) {
    console.error("Producao error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao buscar produção" },
      { status: 500 }
    );
  }
}
