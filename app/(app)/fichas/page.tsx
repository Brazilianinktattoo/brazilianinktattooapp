import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormText } from "@/lib/types/database";
import { FormTextEditor } from "./form-text-editor";

type Model = {
  name: string;
  description: string;
  action: { label: string; href: string } | null;
  status?: string;
};

const MODELS: Model[] = [
  {
    name: "Ficha de Anamnese BIT (padrão)",
    description:
      "Tatuagem e piercing juntos. Gerada a partir de um agendamento — abra o agendamento do cliente e clique em \"Anamnese\".",
    action: { label: "Ir para a Agenda", href: "/" },
  },
  {
    name: "Ficha de Anamnese para Piercing BIT",
    description:
      "Modelo específico só de piercing — aguardando o arquivo do modelo pra ser construído.",
    action: null,
    status: "Aguardando modelo",
  },
  {
    name: "Ficha de Anamnese Tatuagem — Inglês / Espanhol",
    description:
      "Pra tatuadores/piercers visitantes do coworking — o próprio visitante escolhe o idioma ao abrir o link. Gerada a partir do acesso de coworking dele.",
    action: { label: "Ir para Coworking", href: "/coworking" },
  },
  {
    name: "Autorização de Piercing para Menores",
    description:
      "Gerada automaticamente quando o cliente marca \"menor de idade\" ao preencher a Ficha de Anamnese BIT — não precisa gerar à parte.",
    action: null,
  },
];

export default async function FichasPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: texts } = await supabase
    .from("form_texts")
    .select("*")
    .order("label")
    .returns<FormText[]>();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Fichas</h1>
        <p className="text-neutral-400">
          Acesso rápido aos modelos de ficha e autorização usados no estúdio.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {MODELS.map((model) => (
          <div
            key={model.name}
            className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-medium text-white">{model.name}</h2>
              {model.status && (
                <span className="shrink-0 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-400">
                  {model.status}
                </span>
              )}
            </div>
            <p className="text-sm text-neutral-400">{model.description}</p>
            {model.action && (
              <Link
                href={model.action.href}
                className="mt-auto self-start rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 hover:border-gold-soft hover:text-gold"
              >
                {model.action.label}
              </Link>
            )}
          </div>
        ))}
      </div>

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
    </div>
  );
}
