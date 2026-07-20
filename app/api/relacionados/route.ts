import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  host: process.env.DB_HOST || "host.docker.internal",
  database: process.env.DB_NAME || "postgres",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  port: parseInt(process.env.DB_PORT || "5433"),
});

/**
 * CPF/CNPJ relacionados ao titular consultado:
 *  - via CCIR: outros cpf_cnpj que aparecem no serpro_prop com os mesmos CCIRs
 *  - via CAR : CARs do titular (car_prop) pesquisados em detentores_car,
 *              retornando outros cpf_cnpj detentores do mesmo CAR
 * Obs.: detentores_car.cpf_cnpj é formatado; normalizamos para dígitos.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cpf = searchParams.get("cpf");

  if (!cpf) {
    return NextResponse.json({ error: "CPF é obrigatório" }, { status: 400 });
  }

  try {
    const res = await pool.query(
      `WITH meus_ccir AS (
         SELECT DISTINCT ccir
         FROM serpro_prop
         WHERE cpf_cnpj = $1 AND ccir IS NOT NULL AND ccir::text <> ''
       ),
       via_ccir AS (
         SELECT sp.cpf_cnpj AS cpf,
                MAX(NULLIF(sp.detentor, 'N/A')) AS nome,
                COUNT(DISTINCT sp.ccir) AS qtd_ccir
         FROM serpro_prop sp
         JOIN meus_ccir m ON m.ccir = sp.ccir
         WHERE sp.cpf_cnpj IS NOT NULL AND sp.cpf_cnpj <> $1
         GROUP BY sp.cpf_cnpj
       ),
       meus_car AS (
         SELECT DISTINCT cod_imovel_car AS car
         FROM car_prop
         WHERE cpf_cnpj = $1 AND cod_imovel_car IS NOT NULL
       ),
       via_car AS (
         SELECT regexp_replace(dc.cpf_cnpj, '[^0-9]', '', 'g') AS cpf,
                MAX(NULLIF(dc.detentor, 'N/A')) AS nome,
                COUNT(DISTINCT dc.car) AS qtd_car
         FROM detentores_car dc
         JOIN meus_car mc ON mc.car = dc.car
         WHERE dc.cpf_cnpj IS NOT NULL
           AND regexp_replace(dc.cpf_cnpj, '[^0-9]', '', 'g') <> $1
           AND regexp_replace(dc.cpf_cnpj, '[^0-9]', '', 'g') <> ''
         GROUP BY 1
       )
       SELECT
         COALESCE(c.cpf, r.cpf)              AS cpf_cnpj,
         COALESCE(c.nome, r.nome)            AS nome,
         COALESCE(c.qtd_ccir, 0)             AS qtd_ccir,
         COALESCE(r.qtd_car, 0)              AS qtd_car
       FROM via_ccir c
       FULL OUTER JOIN via_car r ON r.cpf = c.cpf
       ORDER BY (COALESCE(c.qtd_ccir,0) + COALESCE(r.qtd_car,0)) DESC, 1`,
      [cpf]
    );

    const relacionados = res.rows.map((r) => ({
      cpf_cnpj: r.cpf_cnpj as string,
      nome: (r.nome as string | null) ?? null,
      qtd_ccir: parseInt(r.qtd_ccir || "0"),
      qtd_car: parseInt(r.qtd_car || "0"),
    }));

    return NextResponse.json({ cpf, relacionados });
  } catch (error) {
    console.error("Relacionados error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao buscar relacionados" },
      { status: 500 }
    );
  }
}
