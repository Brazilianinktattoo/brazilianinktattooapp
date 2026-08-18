"use client";

import { useActionState, useState } from "react";
import {
  submitCoworkingAnamneseSignature,
  type CoworkingAnamneseSignatureState,
} from "@/app/actions/coworking-anamnese";
import { TEXT, healthQuestionsFor } from "@/lib/documents/coworking-anamnese-content";
import type { AnamneseLanguage } from "@/lib/types/database";

const initialState: CoworkingAnamneseSignatureState = {};

const UI: Record<
  AnamneseLanguage,
  {
    yes: string;
    no: string;
    submit: string;
    submitting: string;
    signerLabel: string;
    agree: string;
    successTitle: string;
    successBody: string;
    professional: string;
  }
> = {
  portugues: {
    yes: "Sim",
    no: "Não",
    submit: "Enviar ficha",
    submitting: "Enviando...",
    signerLabel: "Nome completo (confirme como assinatura)",
    agree: "Declaro que as informações acima são verdadeiras.",
    successTitle: "Ficha enviada!",
    successBody: "Obrigado por preencher.",
    professional: "Nome do profissional",
  },
  ingles: {
    yes: "Yes",
    no: "No",
    submit: "Submit form",
    submitting: "Submitting...",
    signerLabel: "Full name (confirm as signature)",
    agree: "I declare the information above is true.",
    successTitle: "Form submitted!",
    successBody: "Thank you for filling this out.",
    professional: "Professional's name",
  },
  espanhol: {
    yes: "Sí",
    no: "No",
    submit: "Enviar formulario",
    submitting: "Enviando...",
    signerLabel: "Nombre completo (confirme como firma)",
    agree: "Declaro que la información anterior es verdadera.",
    successTitle: "¡Formulario enviado!",
    successBody: "Gracias por completarlo.",
    professional: "Nombre del profesional",
  },
};

function HealthQuestion({
  questionKey,
  label,
  ui,
}: {
  questionKey: string;
  label: string;
  ui: (typeof UI)["portugues"];
}) {
  const [yes, setYes] = useState(false);
  return (
    <div className="rounded-lg border border-neutral-800 p-3">
      <p className="text-sm text-neutral-300">{label}</p>
      <div className="mt-2 flex items-center gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name={`health_${questionKey}`}
            value="nao"
            defaultChecked
            onChange={() => setYes(false)}
          />
          {ui.no}
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name={`health_${questionKey}`}
            value="sim"
            onChange={() => setYes(true)}
          />
          {ui.yes}
        </label>
        {yes && (
          <input
            name={`health_${questionKey}_detail`}
            className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100 outline-none focus:border-gold"
          />
        )}
      </div>
    </div>
  );
}

export function CoworkingAnamneseForm({
  token,
  language,
  defaultName,
}: {
  token: string;
  language: AnamneseLanguage;
  defaultName: string;
}) {
  const [state, formAction, pending] = useActionState(
    submitCoworkingAnamneseSignature.bind(null, token),
    initialState
  );
  const t = TEXT[language];
  const ui = UI[language];
  const questions = healthQuestionsFor(language);

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-green-800 bg-green-500/10 p-8 text-center">
        <h2 className="text-lg font-semibold text-green-300">{ui.successTitle}</h2>
        <p className="text-green-200/80">{ui.successBody}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="full_name" className="text-sm text-neutral-300">
            {t.name}
          </label>
          <input
            id="full_name"
            name="full_name"
            required
            defaultValue={defaultName}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cpf" className="text-sm text-neutral-300">
            {t.cpf}
          </label>
          <input id="cpf" name="cpf" className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="birth_date" className="text-sm text-neutral-300">
            {t.birthDate}
          </label>
          <input
            id="birth_date"
            name="birth_date"
            type="date"
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold [color-scheme:dark]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className="text-sm text-neutral-300">
            {t.phone}
          </label>
          <input id="phone" name="phone" className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="address" className="text-sm text-neutral-300">
            {t.address}
          </label>
          <input id="address" name="address" className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cep" className="text-sm text-neutral-300">
            {t.cep}
          </label>
          <input id="cep" name="cep" className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm text-neutral-300">{t.procedure}</span>
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input type="radio" name="procedure_type" value="tatuagem" required />
            {t.tattoo}
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" name="procedure_type" value="piercing" />
            {t.piercing}
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-neutral-800 pt-4">
        <h2 className="font-semibold text-white">{t.section2}</h2>
        <p className="text-xs text-neutral-500">{t.healthIntro}</p>
        {questions.map((q) => (
          <HealthQuestion key={q.key} questionKey={q.key} label={q.label} ui={ui} />
        ))}
      </div>

      <div className="flex flex-col gap-3 border-t border-neutral-800 pt-4">
        <p className="text-sm text-neutral-400">{t.consent}</p>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="professional_name" className="text-sm text-neutral-300">
            {ui.professional}
          </label>
          <input
            id="professional_name"
            name="professional_name"
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="signer_name" className="text-sm text-neutral-300">
            {ui.signerLabel}
          </label>
          <input
            id="signer_name"
            name="signer_name"
            required
            defaultValue={defaultName}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
          />
        </div>
        <label className="flex items-start gap-2 text-sm text-neutral-300">
          <input type="checkbox" name="agree" required className="mt-1" />
          {ui.agree}
        </label>
      </div>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 font-medium text-neutral-950 transition hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? ui.submitting : ui.submit}
      </button>
    </form>
  );
}
