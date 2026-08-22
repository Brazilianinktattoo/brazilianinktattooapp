"use client";

import { useActionState } from "react";
import {
  createAppointmentAnamneseLink,
  type CreateStandaloneAnamneseState,
} from "@/app/actions/coworking-anamnese";
import { STUDIO_TZ } from "@/lib/date";
import type { AnamneseLanguage, CoworkingAnamneseForm } from "@/lib/types/database";

const initialState: CreateStandaloneAnamneseState = {};

const LANGUAGE_LABEL: Record<string, string> = {
  ingles: "Inglês",
  espanhol: "Espanhol",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: STUDIO_TZ,
  });
}

function LanguageRow({
  appointmentId,
  language,
  form,
  canGenerate,
}: {
  appointmentId: string;
  language: AnamneseLanguage;
  form: CoworkingAnamneseForm | null;
  canGenerate: boolean;
}) {
  const action = createAppointmentAnamneseLink.bind(null, appointmentId);
  const [state, formAction, pending] = useActionState(action, initialState);

  const link =
    state.success && state.token && typeof window !== "undefined"
      ? `${window.location.origin}/anamnese-coworking/${state.token}`
      : form && !form.signed_at && typeof window !== "undefined"
        ? `${window.location.origin}/anamnese-coworking/${form.sign_token}`
        : null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-neutral-800 bg-neutral-900/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-neutral-200">
          {LANGUAGE_LABEL[language]}
        </span>
        {form?.signed_at ? (
          <span className="rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-medium text-green-400">
            Preenchida em {formatDateTime(form.signed_at)}
          </span>
        ) : form ? (
          <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-400">
            Aguardando preenchimento
          </span>
        ) : (
          <span className="rounded-full bg-neutral-700/40 px-2.5 py-1 text-xs font-medium text-neutral-400">
            Ficha não gerada
          </span>
        )}
      </div>

      {canGenerate && !form?.signed_at && (
        <form action={formAction}>
          <input type="hidden" name="language" value={language} />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 hover:border-gold-soft hover:text-gold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Gerando..." : form ? "Ver link novamente" : "Gerar link"}
          </button>
        </form>
      )}
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}

      {link && (
        <input
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none"
        />
      )}
    </div>
  );
}

export function LanguageAnamneseCard({
  appointmentId,
  forms,
  canGenerate,
}: {
  appointmentId: string;
  forms: CoworkingAnamneseForm[];
  canGenerate: boolean;
}) {
  const formByLanguage = new Map(forms.map((f) => [f.language, f]));

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
      <h2 className="font-medium text-white">Ficha em outro idioma</h2>
      <p className="mt-1 text-sm text-neutral-400">
        Pra cliente estrangeiro — mesmas perguntas de saúde, em inglês ou
        espanhol.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <LanguageRow
          appointmentId={appointmentId}
          language="ingles"
          form={formByLanguage.get("ingles") ?? null}
          canGenerate={canGenerate}
        />
        <LanguageRow
          appointmentId={appointmentId}
          language="espanhol"
          form={formByLanguage.get("espanhol") ?? null}
          canGenerate={canGenerate}
        />
      </div>
    </div>
  );
}
