"use client";

import { useState } from "react";
import Link from "next/link";
import { CodeBlock } from "@/components/code-block";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Terminal, Key, FileJson, ArrowRight, CheckCircle, Copy, Check, BarChart3 } from "lucide-react";

const codeExamples = {
  python: `import requests
import json

url = "http://192.168.14.31:8000/buscar_cpf"

headers = {
    "x-api-key": "SUA_CHAVE_API"
}

# Lista de CPFs para consulta
cpfs = [
    "00331673037",
    "12345678901",
]

resultado = []

for cpf in cpfs:
    params = {"cpf": cpf}
    
    try:
        r = requests.get(url, params=params, headers=headers)
        
        if r.status_code == 200:
            dados = r.json()
            resultado.append({
                "cpf_consultado": cpf,
                "car_prop": dados.get("car_prop", []),
                "sigef_prop": dados.get("sigef_prop", []),
                "serpro_prop": dados.get("serpro_prop", []),
                "receita_prop": dados.get("receita_prop", [])
            })
        else:
            resultado.append({
                "cpf_consultado": cpf,
                "erro": r.text
            })
    except Exception as e:
        resultado.append({
            "cpf_consultado": cpf,
            "erro": str(e)
        })

# Salvar resultado em JSON
with open("resultado_consulta.json", "w", encoding="utf-8") as f:
    json.dump(resultado, f, indent=4, ensure_ascii=False)

print("Consulta finalizada.")`,

  javascript: `const API_URL = "http://192.168.14.31:8000/buscar_cpf";
const API_KEY = "SUA_CHAVE_API";

async function buscarCPF(cpf) {
  const response = await fetch(\`\${API_URL}?cpf=\${cpf}\`, {
    method: "GET",
    headers: {
      "x-api-key": API_KEY,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(\`Erro: \${response.status}\`);
  }

  return response.json();
}

// Exemplo de uso
async function main() {
  const cpfs = ["00331673037", "12345678901"];
  const resultados = [];

  for (const cpf of cpfs) {
    try {
      const dados = await buscarCPF(cpf);
      resultados.push({
        cpf_consultado: cpf,
        car_prop: dados.car_prop || [],
        sigef_prop: dados.sigef_prop || [],
        serpro_prop: dados.serpro_prop || [],
        receita_prop: dados.receita_prop || []
      });
    } catch (error) {
      resultados.push({
        cpf_consultado: cpf,
        erro: error.message
      });
    }
  }

  console.log(JSON.stringify(resultados, null, 2));
}

main();`,

  curl: `# Consulta simples
curl -X GET "http://192.168.14.31:8000/buscar_cpf?cpf=00331673037" \\
  -H "x-api-key: SUA_CHAVE_API" \\
  -H "Content-Type: application/json"

# Resposta esperada:
# {
#   "car_prop": [...],
#   "sigef_prop": [...],
#   "serpro_prop": [...],
#   "receita_prop": [...]
# }`,

  php: `<?php

$api_url = "http://192.168.14.31:8000/buscar_cpf";
$api_key = "SUA_CHAVE_API";

function buscarCPF($cpf, $api_url, $api_key) {
    $url = $api_url . "?cpf=" . urlencode($cpf);
    
    $options = [
        "http" => [
            "method" => "GET",
            "header" => [
                "x-api-key: " . $api_key,
                "Content-Type: application/json"
            ]
        ]
    ];
    
    $context = stream_context_create($options);
    $response = file_get_contents($url, false, $context);
    
    if ($response === false) {
        return ["erro" => "Falha na requisição"];
    }
    
    return json_decode($response, true);
}

// Exemplo de uso
$cpfs = ["00331673037", "12345678901"];
$resultados = [];

foreach ($cpfs as $cpf) {
    $dados = buscarCPF($cpf, $api_url, $api_key);
    $resultados[] = [
        "cpf_consultado" => $cpf,
        "dados" => $dados
    ];
}

// Salvar resultado
file_put_contents(
    "resultado_consulta.json", 
    json_encode($resultados, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
);

echo "Consulta finalizada.\\n";
?>`,
};

const responseExample = `{
  "car_prop": [
    {
      "cod_imovel": "MT-5107248-XXXX",
      "num_area": 1250.5,
      "ind_status": "AT",
      "ind_tipo": "IRU",
      "des_condic": "ATIVO",
      "municipio": "Cuiabá",
      "cod_estado": "MT",
      "dat_criaca": "2015-03-10",
      "dat_atuali": "2023-08-01",
      "cpf_cnpj": "00331673037",
      "nome": "JOSE DA SILVA"
    }
  ],
  "sigef_prop": [
    {
      "id": 1,
      "parcela_co": "XXXX-XXXX-XXXX",
      "rt": "FULANO DE TAL CREA 12345",
      "art": "ART-2023-XXXX",
      "situacao_i": "Certificado",
      "codigo_imo": "MT-5107248-XXXX",
      "data_submi": "2022-01-15",
      "data_aprov": "2022-03-20",
      "status": "AT",
      "nome_area": "FAZENDA EXEMPLO",
      "registro_m": "123456",
      "registro_d": "1º Oficio",
      "municipio": "Cuiabá",
      "uf_id": "MT",
      "cod_imovel": "MT-5107248-XXXX",
      "cpf_cnpj": "00331673037",
      "nome_do_ca": "JOSE DA SILVA",
      "area": 500.0
    }
  ],
  "serpro_prop": [
    {
      "id": 1,
      "ccir": "000123456789",
      "areatotal": 1750.5,
      "denominacao": "FAZENDA EXEMPLO",
      "municipiosede": "CUIABA",
      "ufsede": "MT",
      "area": 1750.5,
      "matriculaoutranscricao": "12345",
      "cnsouoficio": "1º OFICIO DE IMOVEIS",
      "dataregistro": "2010-06-01",
      "classificacaofundiaria": "PARTICULAR",
      "nometitular": "JOSE DA SILVA",
      "cpf_cnpj": "00331673037",
      "percentualdetencao": 100.0
    }
  ],
  "receita_prop": [
    {
      "id": 1,
      "cib": "000.000.000.000-0",
      "nome_imovel": "FAZENDA EXEMPLO",
      "mun": "CUIABA",
      "uf": "MT",
      "area": 1750.5,
      "contribuinte": "JOSE DA SILVA",
      "cpf_cnpj": "00331673037",
      "data_validade": "2024-12-31",
      "ccir": "000123456789"
    }
  ]
}`;

export default function DocsPage() {
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);

  const handleCopyEndpoint = async () => {
    const text = "http://192.168.14.31:8000/buscar_cpf";
    
    try {
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
      setCopiedEndpoint(true);
      setTimeout(() => setCopiedEndpoint(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar: ', err);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary">
              <Database className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Agrogrid API</h1>
              <p className="text-xs text-muted-foreground">Documentacao</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/summary">
              <Button variant="outline" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Resumo Geral
              </Button>
            </Link>
            <Link href="/terminal">
              <Button variant="outline" className="gap-2">
                <Terminal className="h-4 w-4" />
                Terminal SQL
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-card to-background">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Key className="h-4 w-4" />
              API REST
            </div>
            <h2 className="text-4xl font-bold text-foreground mb-4 text-balance">
              Consulte dados de propriedades rurais por CPF
            </h2>
            <p className="text-lg text-muted-foreground mb-8 text-pretty">
              Acesse informacoes consolidadas do CAR, SIGEF, SERPRO e Receita Federal 
              atraves de uma unica requisicao. Integre facilmente com qualquer linguagem de programacao.
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="#exemplos">
                <Button size="lg" className="gap-2">
                  Ver Exemplos
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Endpoint Section */}
      <section className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h3 className="text-2xl font-bold text-foreground mb-6">Endpoint</h3>
          
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-md bg-emerald-500/20 text-emerald-400 text-sm font-mono font-semibold">
                GET
              </span>
              <code className="flex-1 text-foreground font-mono">
                /buscar_cpf
              </code>
            </div>

            <div 
              className="flex items-center gap-2 p-3 rounded-md bg-secondary cursor-pointer group"
              onClick={handleCopyEndpoint}
            >
              <code className="flex-1 text-sm text-muted-foreground font-mono">
                http://192.168.14.31:8000/buscar_cpf?cpf=00331673037
              </code>
              <Button variant="ghost" size="sm" className="h-8 px-2">
                {copiedEndpoint ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Parameters Section */}
      <section className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h3 className="text-2xl font-bold text-foreground mb-6">Parametros</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Headers */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                Headers
              </h4>
              <div className="space-y-3">
                <div className="flex items-start justify-between p-3 rounded-md bg-secondary">
                  <div>
                    <code className="text-sm font-mono text-foreground">x-api-key</code>
                    <p className="text-xs text-muted-foreground mt-1">
                      Sua chave de autenticacao da API
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-xs bg-destructive/20 text-destructive font-medium">
                    Obrigatorio
                  </span>
                </div>
              </div>
            </div>

            {/* Query Params */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <FileJson className="h-5 w-5 text-primary" />
                Query Parameters
              </h4>
              <div className="space-y-3">
                <div className="flex items-start justify-between p-3 rounded-md bg-secondary">
                  <div>
                    <code className="text-sm font-mono text-foreground">cpf</code>
                    <p className="text-xs text-muted-foreground mt-1">
                      CPF do proprietario (apenas numeros)
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-xs bg-destructive/20 text-destructive font-medium">
                    Obrigatorio
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Response Section */}
      <section className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h3 className="text-2xl font-bold text-foreground mb-6">Resposta</h3>
          
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Response Fields */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h4 className="text-lg font-semibold text-foreground mb-4">Campos retornados</h4>
              <div className="space-y-3">
                {[
                  { name: "car_prop", desc: "Cadastro Ambiental Rural — codigo do imovel, area, status, municipio, CPF e nome do proprietario" },
                  { name: "sigef_prop", desc: "Sistema de Gestao Fundiaria — parcela, situacao, data de aprovacao, area, municipio e CPF" },
                  { name: "serpro_prop", desc: "SERPRO — CCIR, area total, denominacao, municipio, matricula, titular e percentual de detencao" },
                  { name: "receita_prop", desc: "Receita Federal — CIB, nome do imovel, municipio, area, contribuinte e data de validade" },
                ].map((field) => (
                  <div key={field.name} className="flex items-start gap-3 p-3 rounded-md bg-secondary">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <code className="text-sm font-mono text-foreground">{field.name}</code>
                      <p className="text-xs text-muted-foreground mt-1">{field.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Response Example */}
            <div>
              <CodeBlock code={responseExample} language="JSON" showLineNumbers={false} />
            </div>
          </div>
        </div>
      </section>

      {/* Code Examples Section */}
      <section id="exemplos" className="scroll-mt-20">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h3 className="text-2xl font-bold text-foreground mb-6">Exemplos de Codigo</h3>
          
          <Tabs defaultValue="python" className="w-full">
            <TabsList className="mb-6 bg-secondary">
              <TabsTrigger value="python" className="data-[state=active]:bg-card">
                Python
              </TabsTrigger>
              <TabsTrigger value="javascript" className="data-[state=active]:bg-card">
                JavaScript
              </TabsTrigger>
              <TabsTrigger value="curl" className="data-[state=active]:bg-card">
                cURL
              </TabsTrigger>
              <TabsTrigger value="php" className="data-[state=active]:bg-card">
                PHP
              </TabsTrigger>
            </TabsList>

            <TabsContent value="python">
              <CodeBlock code={codeExamples.python} language="Python" />
            </TabsContent>
            <TabsContent value="javascript">
              <CodeBlock code={codeExamples.javascript} language="JavaScript" />
            </TabsContent>
            <TabsContent value="curl">
              <CodeBlock code={codeExamples.curl} language="Bash" />
            </TabsContent>
            <TabsContent value="php">
              <CodeBlock code={codeExamples.php} language="PHP" />
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Database className="h-4 w-4" />
              <span>Agrogrid - Documentacao</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/terminal" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terminal SQL
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
