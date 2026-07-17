import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "postgres",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  port: parseInt(process.env.DB_PORT || "5433"),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cpf = searchParams.get("cpf");

  if (!cpf) {
    return NextResponse.json({ error: "CPF é obrigatório" }, { status: 400 });
  }

  try {
    const queries = [
      {
        table: "serpro_prop",
        label: "CCIR",
        query: `SELECT
                  COUNT(*) as count,
                  SUM(area) as total_area
                FROM serpro_prop WHERE cpf_cnpj = $1`,
      },
      {
        table: "car_prop",
        label: "CAR",
        query: "SELECT COUNT(*) as count, SUM(area) as total_area FROM car_prop WHERE cpf_cnpj = $1",
      },
      {
        table: "receita_prop",
        label: "CIB",
        query: "SELECT COUNT(*) as count, SUM(area) as total_area FROM receita_prop WHERE cpf_cnpj = $1",
      },
      {
        table: "sigef_prop",
        label: "GEO",
        query: "SELECT COUNT(*) as count, SUM(area) as total_area FROM sigef_prop WHERE cpf_cnpj = $1",
      },
    ];

    const results = await Promise.all(
      queries.map((q) => pool.query(q.query, [cpf]))
    );

    // Buscar o nome do detentor (Prioridade: SERPRO -> CAR)
    let detentor = "Não encontrado";
    
    const serproRes = await pool.query(
      "SELECT detentor FROM serpro_prop WHERE cpf_cnpj = $1 LIMIT 1",
      [cpf]
    );

    if (serproRes.rows.length > 0 && serproRes.rows[0].detentor) {
      detentor = serproRes.rows[0].detentor;
    } else {
      const carRes = await pool.query(
        "SELECT detentor FROM car_prop WHERE cpf_cnpj = $1 LIMIT 1",
        [cpf]
      );
      if (carRes.rows.length > 0 && carRes.rows[0].detentor) {
        detentor = carRes.rows[0].detentor;
      }
    }

    const summary = queries.map((q, i) => {
      const row = results[i].rows[0];
      return {
        table: q.table,
        label: q.label,
        count: parseInt(row.count || "0"),
        total_area: parseFloat(row.total_area || "0"),
      };
    });

    // Detalhamento específico do CAR por status
    const carDetailsRes = await pool.query(
      `SELECT 
        CASE 
          WHEN ind_status IN ('AT', 'PE') THEN 'Ativos/Pendentes'
          WHEN ind_status = 'CA' THEN 'Cancelados'
          ELSE 'Outros'
        END as status_group,
        COUNT(*) as count,
        SUM(area) as total_area
      FROM car_prop 
      WHERE cpf_cnpj = $1 
      GROUP BY status_group`,
      [cpf]
    );

    const car_details = carDetailsRes.rows.map(row => ({
      status: row.status_group,
      count: parseInt(row.count || "0"),
      total_area: parseFloat(row.total_area || "0")
    }));

    // Detalhamento específico do GEO (SIGEF)
    const geoDetailsRes = await pool.query(
      `SELECT 
        (SELECT COUNT(DISTINCT parcela_co) FROM sigef_prop WHERE cpf_cnpj = $1) as parcelas_count,
        (SELECT SUM(area) FROM sigef_prop WHERE cpf_cnpj = $1) as parcelas_area,
        (SELECT COUNT(DISTINCT registro_m) FROM sigef_prop WHERE cpf_cnpj = $1 AND registro_m IS NOT NULL AND registro_m <> '') as matriculas_count,
        (SELECT SUM(area) FROM sigef_prop WHERE cpf_cnpj = $1 AND registro_m IS NOT NULL AND registro_m <> '') as matriculas_area`,
      [cpf]
    );

    const geo_row = geoDetailsRes.rows[0];
    const geo_details = [
      { label: "Parcelas", count: parseInt(geo_row.parcelas_count || "0"), total_area: parseFloat(geo_row.parcelas_area || "0") },
      { label: "Matrículas", count: parseInt(geo_row.matriculas_count || "0"), total_area: parseFloat(geo_row.matriculas_area || "0") }
    ];

    // Detalhamento específico do CCIR (SERPRO)
    const ccirDetailsRes = await pool.query(
      `WITH base AS (
        SELECT ccir, areatotal, area, matricula, percentual
        FROM serpro_prop
        WHERE cpf_cnpj = $1
      ),
      matricula_counts AS (
        SELECT matricula, COUNT(*) as cnt
        FROM base
        WHERE matricula IS NOT NULL AND matricula <> ''
        GROUP BY matricula
      )
      SELECT
        (SELECT COUNT(*) FROM base) as total_count,
        (SELECT SUM(area) FROM base) as total_area,
        (SELECT COUNT(DISTINCT ccir) FROM base) as detencao_count,
        (SELECT SUM(areatotal * (COALESCE(percentual, 100) / 100.0)) FROM (SELECT DISTINCT ccir, areatotal, percentual FROM base) t) as detencao_area,

        -- Matrícula: matrículas únicas preenchidas
        (SELECT COUNT(DISTINCT matricula) FROM base WHERE matricula IS NOT NULL AND matricula <> '') as m_valida_count,
        (SELECT SUM(area) FROM (SELECT matricula, MAX(area) as area FROM base WHERE matricula IS NOT NULL AND matricula <> '' GROUP BY matricula) t) as m_valida_area,

        -- Matrícula não validada: CCIRs sem matrícula (1 por CCIR) + grupos de matrícula duplicada (1 por grupo)
        (
          (SELECT COUNT(DISTINCT ccir) FROM base WHERE matricula IS NULL OR matricula = '') +
          (SELECT COUNT(*) FROM matricula_counts WHERE cnt > 1)
        ) as m_invalida_count,
        (
          COALESCE((SELECT SUM(areatotal) FROM (SELECT DISTINCT ccir, areatotal FROM base WHERE matricula IS NULL OR matricula = '') t), 0) +
          COALESCE((SELECT SUM(max_area) FROM (SELECT MAX(areatotal) as max_area FROM base b JOIN matricula_counts mc ON b.matricula = mc.matricula WHERE mc.cnt > 1 GROUP BY b.matricula) t), 0)
        ) as m_invalida_area`,
      [cpf]
    );

    const ccir_row = ccirDetailsRes.rows[0];
    const ccir_details = [
      { label: "Registros Totais", count: parseInt(ccir_row.total_count || "0"), total_area: parseFloat(ccir_row.total_area || "0") },
      { label: "Detenção do Titular", count: parseInt(ccir_row.detencao_count || "0"), total_area: parseFloat(ccir_row.detencao_area || "0") },
      { label: "Matrícula", count: parseInt(ccir_row.m_valida_count || "0"), total_area: parseFloat(ccir_row.m_valida_area || "0") },
      { label: "Matrícula não validada", count: parseInt(ccir_row.m_invalida_count || "0"), total_area: parseFloat(ccir_row.m_invalida_area || "0") }
    ];

    // Detalhamento específico do CIB (Receita Federal)
    const cibDetailsRes = await pool.query(
      `WITH serpro_ccirs AS (
        -- Seleciona CCIRs únicos e suas áreas/percentuais do titular no SERPRO
        SELECT ccir, areatotal, COALESCE(percentual, 100) as percentual
        FROM (
          SELECT ccir, areatotal, percentual,
                 ROW_NUMBER() OVER (PARTITION BY ccir ORDER BY areatotal DESC) as rn
          FROM serpro_prop
          WHERE cpf_cnpj = $1
        ) t
        WHERE rn = 1
      ),
      cib_titular AS (
        -- Seleciona registros diretos na Receita Federal
        SELECT cib, area
        FROM receita_prop
        WHERE cpf_cnpj = $1
      )
      SELECT
        (SELECT COUNT(*) FROM serpro_ccirs) as pesquisados_count,
        (SELECT SUM(areatotal * (percentual / 100.0)) FROM serpro_ccirs) as pesquisados_area,
        (SELECT COUNT(DISTINCT cib) FROM cib_titular) as titular_count,
        (SELECT SUM(area) FROM cib_titular) as titular_area`,
      [cpf]
    );

    const cib_row = cibDetailsRes.rows[0];
    const cib_details = [
      { label: "Pesquisados", count: parseInt(cib_row.pesquisados_count || "0"), total_area: parseFloat(cib_row.pesquisados_area || "0") },
      { label: "Titular", count: parseInt(cib_row.titular_count || "0"), total_area: parseFloat(cib_row.titular_area || "0") }
    ];

    // Novo: Distribuição por Município (SERPRO)
    const munDetailsRes = await pool.query(
      `WITH unique_ccirs AS (
        SELECT ccir, areatotal, municipio, uf, COALESCE(percentual, 100) as percentual
        FROM (
          SELECT ccir, areatotal, municipio, uf, percentual,
                 ROW_NUMBER() OVER (PARTITION BY ccir ORDER BY areatotal DESC) as rn
          FROM serpro_prop
          WHERE cpf_cnpj = $1
        ) t
        WHERE rn = 1
      )
      SELECT 
        municipio, 
        uf, 
        COUNT(*) as count, 
        SUM(areatotal * (percentual / 100.0)) as total_area
      FROM unique_ccirs
      GROUP BY municipio, uf
      ORDER BY total_area DESC`,
      [cpf]
    );

    const mun_details = munDetailsRes.rows.map(row => ({
      municipio: row.municipio,
      uf: row.uf,
      count: parseInt(row.count || "0"),
      total_area: parseFloat(row.total_area || "0")
    }));

    // Novo: Classificação por Tamanho (Ranges)
    const rangeDetailsRes = await pool.query(
      `WITH unique_ccirs AS (
        SELECT areatotal * (COALESCE(percentual, 100) / 100.0) as area_titular
        FROM (
          SELECT ccir, areatotal, percentual,
                 ROW_NUMBER() OVER (PARTITION BY ccir ORDER BY areatotal DESC) as rn
          FROM serpro_prop
          WHERE cpf_cnpj = $1
        ) t
        WHERE rn = 1
      )
      SELECT 
        CASE 
          WHEN area_titular <= 20 THEN 'Até 20 ha'
          WHEN area_titular > 20 AND area_titular <= 50 THEN '20 - 50 ha'
          WHEN area_titular > 50 AND area_titular <= 100 THEN '50 - 100 ha'
          WHEN area_titular > 100 AND area_titular <= 250 THEN '100 - 250 ha'
          WHEN area_titular > 250 AND area_titular <= 500 THEN '250 - 500 ha'
          ELSE 'Mais que 500 ha'
        END as range_label,
        COUNT(*) as count,
        SUM(area_titular) as total_area,
        CASE 
          WHEN area_titular <= 20 THEN 1
          WHEN area_titular > 20 AND area_titular <= 50 THEN 2
          WHEN area_titular > 50 AND area_titular <= 100 THEN 3
          WHEN area_titular > 100 AND area_titular <= 250 THEN 4
          WHEN area_titular > 250 AND area_titular <= 500 THEN 5
          ELSE 6
        END as sort_order
      FROM unique_ccirs
      GROUP BY range_label, sort_order
      ORDER BY sort_order`,
      [cpf]
    );

    const range_details = rangeDetailsRes.rows.map(row => ({
      label: row.range_label,
      count: parseInt(row.count || "0"),
      total_area: parseFloat(row.total_area || "0")
    }));

    // Novo: Aderência Documental (Validados)
    const validDetailsRes = await pool.query(
      `SELECT
          parcela_co,
          ccir,
          cpf_cnpj,
          detentor,
          area_sigef,
          area_serpro,
          diferenca_percentual,
          CASE
              WHEN diferenca_percentual > 5 THEN 'ATENÇÃO'
              ELSE 'OK'
          END AS atencao,
          municipio,
          matricula,
          percentual
      FROM (
          SELECT *,
                 ROW_NUMBER() OVER (
                     PARTITION BY parcela_co
                     ORDER BY diferenca_percentual
                 ) AS rn
          FROM (
              SELECT
                  s.parcela_co::text AS parcela_co,
                  s.ccir,
                  s.cpf_cnpj,
                  COALESCE(s.detentor, sp.detentor) AS detentor,
                  s.area AS area_sigef,
                  sp.area AS area_serpro,
                  sp.matricula,
                  sp.municipio,
                  sp.percentual,
                  ROUND(
                      ABS(s.area - sp.area) / NULLIF(sp.area, 0) * 100, 2
                  ) AS diferenca_percentual
              FROM sigef_prop s
              INNER JOIN serpro_prop sp
                  ON s.ccir::text = sp.ccir::text
                 AND s.cod_ibge::text = sp.cod_ibge::text
                 AND s.cpf_cnpj::text = sp.cpf_cnpj::text
              WHERE s.cpf_cnpj::text = $1
          ) base
      ) filtrado
      WHERE rn = 1
      ORDER BY parcela_co`,
      [cpf]
    );

    const valid_details = validDetailsRes.rows.map(row => ({
      parcela_co: row.parcela_co,
      ccir: row.ccir,
      area_sigef: parseFloat(row.area_sigef || "0"),
      area_serpro: parseFloat(row.area_serpro || "0"),
      diferenca: parseFloat(row.diferenca_percentual || "0"),
      atencao: row.atencao,
      municipio: row.municipio,
      matricula: row.matricula,
    }));

    // Novo: Parcelas exclusivas do SIGEF com busca de correspondência potencial no SERPRO
    const nonValidGeoRes = await pool.query(
      `WITH exclusives AS (
          SELECT 
              s.parcela_co::text AS parcela_co,
              s.ccir AS ccir_sigef,
              s.area AS area_sigef,
              s.registro_m AS matricula_sigef,
              s.cod_ibge,
              s.uf_id,
              s.cpf_cnpj
          FROM sigef_prop s
          WHERE s.cpf_cnpj::text = $1
          AND NOT EXISTS (
              SELECT 1 FROM serpro_prop sp_strict
              WHERE s.ccir::text = sp_strict.ccir::text
                AND s.cod_ibge::text = sp_strict.cod_ibge::text
                AND s.cpf_cnpj::text = sp_strict.cpf_cnpj::text
          )
      ),
      potential_matches AS (
          SELECT
              e.*,
              sp.ccir AS ccir_serpro,
              sp.matricula AS matricula_serpro,
              sp.area AS area_serpro,
              CASE
                  WHEN (e.matricula_sigef IS NOT NULL AND e.matricula_sigef <> '' AND e.matricula_sigef = sp.matricula)
                       AND (ABS(e.area_sigef - sp.area) / NULLIF(sp.area, 0) <= 0.05) THEN 'Área e Matrícula'
                  WHEN (e.matricula_sigef IS NOT NULL AND e.matricula_sigef <> '' AND e.matricula_sigef = sp.matricula) THEN 'Matrícula'
                  WHEN (ABS(e.area_sigef - sp.area) / NULLIF(sp.area, 0) <= 0.05) THEN 'Área'
                  ELSE 'Município'
              END as match_type,
              ROW_NUMBER() OVER (
                  PARTITION BY e.parcela_co
                  ORDER BY (CASE
                              WHEN e.matricula_sigef = sp.matricula AND ABS(e.area_sigef - sp.area) / NULLIF(sp.area, 0) <= 0.05 THEN 1
                              WHEN e.matricula_sigef = sp.matricula THEN 2
                              WHEN ABS(e.area_sigef - sp.area) / NULLIF(sp.area, 0) <= 0.05 THEN 3
                              ELSE 4 END),
                           ABS(e.area_sigef - sp.area)
              ) as match_rn
          FROM exclusives e
          INNER JOIN serpro_prop sp ON e.cpf_cnpj::text = sp.cpf_cnpj::text
          AND e.cod_ibge::text = sp.cod_ibge::text -- Garantia obrigatória de Município
      )
      SELECT
          parcela_co,
          ccir_sigef,
          ccir_serpro,
          matricula_sigef,
          matricula_serpro,
          area_sigef,
          area_serpro,
          match_type,
          (SELECT municipio FROM car_prop c WHERE c.cod_ibge::text = cod_ibge::text LIMIT 1) as municipio,
          uf_id as uf
      FROM potential_matches
      WHERE match_rn = 1
      ORDER BY parcela_co`,
      [cpf]
    );

    const non_valid_geo = nonValidGeoRes.rows.map(row => ({
      parcela_co: row.parcela_co,
      ccir_sigef: row.ccir_sigef,
      ccir_serpro: row.ccir_serpro,
      matricula_sigef: row.matricula_sigef,
      matricula_serpro: row.matricula_serpro,
      area_sigef: parseFloat(row.area_sigef || "0"),
      area_serpro: parseFloat(row.area_serpro || "0"),
      match_type: row.match_type,
      municipio: row.municipio,
      uf: row.uf
    }));

    // Buscar as geometrias das parcelas (limites/polígonos) como GeoJSON.
    // A matrícula (registro_m) vem do SIGEF, unido por parcela_co.
    const mapFeaturesRes = await pool.query(
      `SELECT
         m.id,
         m.parcela_co,
         m.codigo_imo,
         m.car,
         s.registro_m AS matricula,
         ST_AsGeoJSON(m.geom) as geojson,
         ST_Y(ST_Centroid(m.geom)) as lat,
         ST_X(ST_Centroid(m.geom)) as lng
       FROM agrogrid_mapa m
       LEFT JOIN LATERAL (
         SELECT sp.registro_m
         FROM sigef_prop sp
         WHERE sp.parcela_co::text = m.parcela_co::text
           AND sp.registro_m IS NOT NULL AND sp.registro_m <> ''
         LIMIT 1
       ) s ON true
       WHERE m.cpf_cnpj = $1`,
      [cpf]
    );

    const map_features = mapFeaturesRes.rows.map(row => ({
      id: row.id,
      parcela_co: row.parcela_co,
      codigo_imo: row.codigo_imo,
      matricula: row.matricula ?? null,
      car: row.car,
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
      geometry: row.geojson ? JSON.parse(row.geojson) : null,
    }));

    // Novo: Análise Patrimonial (Uso do Solo - land_use_price) - Retorna Detalhes para Filtro no Front
    const landUseRes = await pool.query(
      `SELECT 
        parcela as parcela_co,
        COALESCE(area_irrig, 0) as area_irrig,
        COALESCE(area_agri, 0) as area_agri,
        COALESCE(area_past, 0) as area_past,
        COALESCE(area_perm, 0) as area_perm,
        COALESCE(area_refl, 0) as area_refl,
        COALESCE(area_mata, 0) as area_mata,
        COALESCE(area_total, 0) as area_total,
        COALESCE(minimo::numeric, 0) as total_minimo,
        COALESCE(maximo::numeric, 0) as total_maximo
      FROM land_use_price 
      WHERE cpf_cnpj = $1`,
      [cpf]
    );

    const land_use_details = landUseRes.rows.map(row => ({
      parcela_co: row.parcela_co,
      irrigacao: parseFloat(row.area_irrig || "0"),
      agricultura: parseFloat(row.area_agri || "0"),
      pastagem: parseFloat(row.area_past || "0"),
      culturas_permanentes: parseFloat(row.area_perm || "0"),
      reflorestamento: parseFloat(row.area_refl || "0"),
      mata_app_outros: parseFloat(row.area_mata || "0"),
      total: parseFloat(row.area_total || "0"),
      total_minimo: parseFloat(row.total_minimo || "0"),
      total_maximo: parseFloat(row.total_maximo || "0")
    }));

    return NextResponse.json({ 
      cpf, 
      detentor, 
      summary, 
      car_details, 
      geo_details, 
      ccir_details, 
      cib_details,
      mun_details,
      range_details,
      valid_details,
      non_valid_geo,
      map_features,
      land_use_details // Alterado para detalhes
    });
  } catch (error) {
    console.error("Summary error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao buscar resumo" },
      { status: 500 }
    );
  }
}
