"use client";

import { useActionState, useState } from "react";
import {
  submitStudentAnamneseSignature,
  type StudentAnamneseSignatureState,
} from "@/app/actions/student-anamnese";
import { STUDENT_HEALTH_QUESTIONS } from "@/lib/documents/student-anamnese-questions";

const initialState: StudentAnamneseSignatureState = {};

function Field({
  id,
  label,
  type = "text",
  required = false,
}: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm text-neutral-300">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold [color-scheme:dark]"
      />
    </div>
  );
}

function HealthQuestion({
  questionKey,
  label,
  detail,
}: {
  questionKey: string;
  label: string;
  detail?: boolean;
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
          Não
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name={`health_${questionKey}`}
            value="sim"
            onChange={() => setYes(true)}
          />
          Sim
        </label>
        {yes && detail && (
          <input
            name={`health_${questionKey}_detail`}
            placeholder="Qual/Especifique"
            className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100 outline-none focus:border-gold"
          />
        )}
      </div>
    </div>
  );
}

export function StudentAnamneseForm({
  token,
  consentText,
  photoAuthorizationText,
}: {
  token: string;
  consentText: string;
  photoAuthorizationText: string;
}) {
  const [state, formAction, pending] = useActionState(
    submitStudentAnamneseSignature.bind(null, token),
    initialState
  );

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-green-800 bg-green-500/10 p-8 text-center">
        <h2 className="text-lg font-semibold text-green-300">Ficha enviada!</h2>
        <p className="text-green-200/80">
          Obrigado por preencher. Qualquer dúvida, fale com seu tatuador(a)/piercer
          ou com a recepção.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="font-semibold text-white">1. Identificação do cliente</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="full_name" label="Nome completo" required />
          <Field id="rg" label="RG" required />
          <Field id="cpf" label="CPF" required />
          <Field id="birth_date" label="Data de nascimento" type="date" required />
          <Field id="address" label="Endereço" required />
          <Field id="cep" label="CEP" required />
          <Field id="city" label="Cidade" required />
          <Field id="email" label="E-mail" type="email" required />
          <Field id="whatsapp" label="WhatsApp" required />
          <Field id="client_origin" label="Como nos conheceu" required />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="font-semibold text-white">2. Histórico de saúde</h2>
        <p className="text-xs text-neutral-500">
          É obrigatório declarar informações verdadeiras sobre sua saúde.
        </p>
        {STUDENT_HEALTH_QUESTIONS.map((q) => (
          <HealthQuestion key={q.key} questionKey={q.key} label={q.label} detail={q.detail} />
        ))}
        <Field id="blood_type" label="Tipo sanguíneo e fator RH" required />
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="font-semibold text-white">3. Termo de responsabilidade</h2>
        <p className="text-sm text-neutral-400">{consentText}</p>
        <label className="flex items-start gap-2 text-sm text-neutral-300">
          <input type="checkbox" name="photo_authorization" className="mt-1" />
          {photoAuthorizationText}
        </label>
        <Field id="signer_name" label="Nome completo (confirme como assinatura)" required />
        <label className="flex items-start gap-2 text-sm text-neutral-300">
          <input type="checkbox" name="agree" required className="mt-1" />
          Declaro que as informações acima são verdadeiras.
        </label>
      </div>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 font-medium text-neutral-950 transition hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Enviar ficha"}
      </button>
    </form>
  );
}
