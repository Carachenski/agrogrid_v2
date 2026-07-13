import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  host: process.env.DB_HOST || "host.docker.internal",
  database: process.env.DB_NAME || "postgres",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  port: parseInt(process.env.DB_PORT || "5433"),
});

const ALLOWED_TABLES = ["car_prop", "sigef_prop", "serpro_prop", "receita_prop"];

function isReadOnlyQuery(query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  
  // Só permite SELECT
  if (!normalizedQuery.startsWith("select")) {
    return false;
  }
  
  // Bloqueia palavras-chave de modificação
  const dangerousKeywords = [
    "insert",
    "update",
    "delete",
    "drop",
    "alter",
    "create",
    "truncate",
    "grant",
    "revoke",
    "execute",
    "exec",
    "into",
    ";--",
    "/*",
  ];
  
  for (const keyword of dangerousKeywords) {
    if (normalizedQuery.includes(keyword)) {
      return false;
    }
  }
  
  return true;
}

function containsAllowedTablesOnly(query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  
  // Verifica se a query referencia apenas tabelas permitidas
  const fromMatch = normalizedQuery.match(/from\s+(\w+)/gi);
  const joinMatch = normalizedQuery.match(/join\s+(\w+)/gi);
  
  const tablesInQuery: string[] = [];
  
  if (fromMatch) {
    fromMatch.forEach((match) => {
      const tableName = match.replace(/from\s+/i, "").trim();
      tablesInQuery.push(tableName);
    });
  }
  
  if (joinMatch) {
    joinMatch.forEach((match) => {
      const tableName = match.replace(/join\s+/i, "").trim();
      tablesInQuery.push(tableName);
    });
  }
  
  // Se não encontrou nenhuma tabela, pode ser uma query inválida
  if (tablesInQuery.length === 0) {
    return false;
  }
  
  // Verifica se todas as tabelas são permitidas
  return tablesInQuery.every((table) => ALLOWED_TABLES.includes(table));
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    
    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query SQL é obrigatória" },
        { status: 400 }
      );
    }
    
    if (!isReadOnlyQuery(query)) {
      return NextResponse.json(
        { error: "Apenas consultas SELECT são permitidas" },
        { status: 403 }
      );
    }
    
    if (!containsAllowedTablesOnly(query)) {
      return NextResponse.json(
        { error: `Apenas as tabelas ${ALLOWED_TABLES.join(", ")} são permitidas` },
        { status: 403 }
      );
    }
    
    const startTime = Date.now();
    const result = await pool.query(query);
    const executionTime = Date.now() - startTime;
    
    return NextResponse.json({
      rows: result.rows,
      fields: result.fields.map((f) => ({ name: f.name, dataTypeID: f.dataTypeID })),
      rowCount: result.rowCount,
      executionTime,
    });
  } catch (error) {
    console.error("Query error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao executar query" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    tables: ALLOWED_TABLES,
    message: "Use POST para executar consultas SQL",
  });
}
