import Link from "next/link";
import { requireClientRegistrar } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormText } from "@/lib/types/database";
import { FormTextEditor } from "./form-text-editor";
import { StudentAnamneseGenerator } from "./student-anamnese-generator";
import { QrLinkCard } from "./qr-link-card";

export default async function FichasPage() {
  const { profile } = await requireClientRegistrar();
  const isAdmin = profile.role === "admin";
  const isChefePiercing = profile.role === "chefe_piercing";

  const bitPadraoAction = isAdmin
    ? { label: "Ir para a Agenda", href: "/agenda" }
    : profile.role === "tatuador"
      ? { label: "Ir para Meus Clientes", href: "/meus-clientes" }
      : { label: "Ir para a Agenda", href: "/" };

  const supabase = await createClient();
  const { data: texts } = isAdmin
    ? await supabase.from("form_texts").select("*").order("label").returns<FormText[]>()
    : { data: [] as FormText[] };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Fichas</h1>
        <p className="text-neutral-400">
          Acesso rápido aos modelos de ficha e autorização usados no estúdio.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
          <h2 className="font-medium text-white">Ficha de Anamnese BIT (padrão)</h2>
          <p className="text-sm text-neutral-400">
            Tatuagem e piercing juntos. Gerada a partir de um agendamento —
            abra o agendamento do cliente e clique em &quot;Anamnese&quot;.
          </p>
          <Link
            href={bitPadraoAction.href}
            className="mt-auto self-start rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 hover:border-gold-soft hover:text-gold"
          >
            {bitPadraoAction.label}
          </Link>
        </div>

        <QrLinkCard isAdmin={isAdmin} />

        {isAdmin && (
          <div className="flex flex-col gap-3 rounded-xl border border-gold-soft/30 bg-neutral-900/40 p-5">
            <h2 className="font-medium text-white">Todas as Fichas de Anamnese</h2>
            <p className="text-sm text-neutral-400">
              Veja todas as fichas já preenchidas, de qualquer cliente e
              qualquer colaborador — abra o PDF ou já crie o atendimento.
            </p>
            <Link
              href="/fichas/todas"
              className="mt-auto self-start rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 hover:border-gold-soft hover:text-gold"
            >
              Ver todas as fichas
            </Link>
          </div>
        )}

        {(isAdmin || isChefePiercing) && (
          <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 sm:col-span-2">
            <h2 className="font-medium text-white">Ficha de Anamnese de Piercing</h2>
            <p className="text-sm text-neutral-400">
              Não precisa de agendamento prévio — preencha os dados do
              procedimento e gere o link na hora.
            </p>
            <StudentAnamneseGenerator />
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
          <h2 className="font-medium text-white">
            Ficha de Anamnese Tatuagem — Inglês / Espanhol
          </h2>
          <p className="text-sm text-neutral-400">
            Pra tatuadores/piercers visitantes do coworking — o link já sai
            pronto ao criar o acesso, e o próprio visitante escolhe o idioma.
          </p>
          <Link
            href="/coworking"
            className="mt-auto self-start rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 hover:border-gold-soft hover:text-gold"
          >
            Ir para Coworking
          </Link>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
          <h2 className="font-medium text-white">
            Autorização de Piercing para Menores
          </h2>
          <p className="text-sm text-neutral-400">
            Gerada automaticamente quando o cliente marca &quot;menor de
            idade&quot; ao preencher a Ficha de Anamnese BIT — não precisa
            gerar à parte.
          </p>
        </div>
      </div>

      {isAdmin && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-neutral-300">
            Textos editáveis
          </h2>
          <div className="grid gap-4">
            {(texts ?? []).map((text) => (
              <FormTextEditor key={text.key} text={text} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
