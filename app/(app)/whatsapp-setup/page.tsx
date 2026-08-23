import { requireAdmin } from "@/lib/auth";
import { RegisterNumberForm } from "./register-number-form";
import { TestMessageForm } from "./test-message-form";

export default async function WhatsAppSetupPage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div>
        <h1 className="text-xl font-semibold text-white">
          Configuração do WhatsApp (API oficial)
        </h1>
        <p className="text-neutral-400">
          Página temporária para ativar o número na API oficial da Meta e testar o
          envio. Pode ser removida depois que tudo estiver funcionando.
        </p>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="font-medium text-white">1. Registrar número</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Passo único — ativa o número cadastrado no WhatsApp Manager pra poder
          enviar e receber mensagens pela API.
        </p>
        <RegisterNumberForm />
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="font-medium text-white">2. Enviar mensagem de teste</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Só funciona depois do passo 1 ter dado certo.
        </p>
        <TestMessageForm />
      </div>
    </div>
  );
}
