import requests
import json

url = "http://192.168.14.31:8000/buscar_cpf"

headers = {
    "x-api-key": "agrogrid_2026"
}

# lista de CPFs
cpfs = [
   '28421250884',
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

# salvar json
with open("resultado_consulta.json", "w", encoding="utf-8") as f:
    json.dump(resultado, f, indent=4, ensure_ascii=False)

print("Consulta finalizada.")