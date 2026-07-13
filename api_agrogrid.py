from fastapi import FastAPI, Header, HTTPException
import psycopg2

app = FastAPI()

API_KEY = "agrogrid_2026"


def conectar():
    return psycopg2.connect(
        host="localhost",
        database="postgres",
        user="postgres",
        password="postgres",
        port="5433"
    )


def consulta(cur, tabela, coluna_cpf, cpf):

    query = f"""
    SELECT *
    FROM {tabela}
    WHERE {coluna_cpf} = %s
    """

    cur.execute(query, (cpf,))
    dados = cur.fetchall()

    if not dados:
        return []

    colunas = [desc[0] for desc in cur.description]

    resultado = []
    for linha in dados:
        resultado.append(dict(zip(colunas, linha)))

    return resultado


@app.get("/buscar_cpf")
def buscar_cpf(cpf: str, x_api_key: str = Header(None)):

    if x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="API KEY inválida")

    conn = conectar()
    cur = conn.cursor()

    resposta = {
        "cpf": cpf,
        "car_prop": consulta(cur, "car_prop", "cpf_cnpj", cpf),
        "sigef_prop": consulta(cur, "sigef_prop", "cpf_cnpj", cpf),
        "serpro_prop": consulta(cur, "serpro_prop", "cpf_cnpj", cpf),
        "receita_prop": consulta(cur, "receita_prop", "cpf_cnpj", cpf)
    }

    cur.close()
    conn.close()

    return resposta


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)