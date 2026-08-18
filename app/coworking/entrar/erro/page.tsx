const MESSAGES: Record<string, { title: string; body: string }> = {
  invalido: {
    title: "Link inválido",
    body: "Esse link de acesso não existe ou não é mais válido. Confira com o estúdio.",
  },
  "ainda-nao": {
    title: "Ainda não chegou a hora",
    body: "Esse acesso ainda não começou. Volte no início do período combinado com o estúdio.",
  },
  expirado: {
    title: "Acesso expirado",
    body: "O período desse acesso já terminou. Fale com o estúdio se precisar de mais tempo.",
  },
  saiu: {
    title: "Sessão encerrada",
    body: "Você saiu do sistema. Peça um novo link ao estúdio se precisar voltar.",
  },
};

export default async function CoworkingErrorPage(
  props: PageProps<"/coworking/entrar/erro">
) {
  const searchParams = await props.searchParams;
  const motivo =
    typeof searchParams.motivo === "string" ? searchParams.motivo : "invalido";
  const msg = MESSAGES[motivo] ?? MESSAGES.invalido;

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-8 text-center">
      <h1 className="text-lg font-semibold text-white">{msg.title}</h1>
      <p className="text-neutral-400">{msg.body}</p>
    </div>
  );
}
