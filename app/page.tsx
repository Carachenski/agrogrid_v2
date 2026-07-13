import { redirect } from "next/navigation";

// A raiz redireciona para a primeira etapa do fluxo (Resumo Patrimonial).
export default function Home() {
  redirect("/summary");
}
