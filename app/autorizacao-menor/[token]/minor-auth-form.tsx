"use client";

import { useActionState, useState } from "react";
import {
  submitMinorAuthorizationSignature,
  type MinorAuthSignatureState,
} from "@/app/actions/minor-authorization";
import { MINOR_HEALTH_QUESTIONS } from "@/lib/documents/minor-authorization-questions";

const initialState: MinorAuthSignatureState = {};

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

function HealthQuestion({ questionKey, label }: { questionKey: string; label: string }) {
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
        {yes && (
          <input
            name={`health_${questionKey}_detail`}
            placeholder="Detalhe"
            className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100 outline-none focus:border-gold"
          />
        )}
      </div>
    </div>
  );
}

export function MinorAuthForm({
  token,
  minorName,
}: {
  token: string;
  minorName: string;
}) {
  const [state, formAction, pending] = useActionState(
    submitMinorAuthorizationSignature.bind(null, token),
    initialState
  );

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-green-800 bg-green-500/10 p-8 text-center">
        <h2 className="text-lg font-semibold text-green-300">Autorização enviada!</h2>
        <p className="text-green-200/80">Obrigado. O estúdio já recebeu sua autorização.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <p className="text-sm text-neutral-400">
        Autorização para o(a) menor <strong className="text-neutral-200">{minorName}</strong>{" "}
        realizar procedimento de piercing no estúdio, a ser preenchida pelo
        responsável legal.
      </p>

      <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="font-semibold text-white">Dados do responsável</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="guardian_name" label="Nome completo" required />
          <Field id="guardian_rg" label="RG" />
          <Field id="guardian_cpf" label="CPF" />
          <Field id="guardian_birth_date" label="Data de nascimento" type="date" />
          <Field id="guardian_marital_status" label="Estado civil" />
          <Field id="guardian_phone" label="Telefone" />
          <Field id="guardian_email" label="E-mail" type="email" />
          <Field id="guardian_address" label="Endereço" />
          <Field id="guardian_neighborhood" label="Bairro" />
          <Field id="guardian_city" label="Cidade" />
          <Field id="guardian_state" label="Estado" />
          <Field id="guardian_cep" label="CEP" />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="font-semibold text-white">Dados complementares da(o) menor</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="minor_rg" label="RG" />
          <Field id="minor_cpf" label="CPF" />
        </div>
        {MINOR_HEALTH_QUESTIONS.map((q) => (
          <HealthQuestion key={q.key} questionKey={q.key} label={q.label} />
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
        <p className="text-sm text-neutral-400">
          Declaro serem verdadeiras as afirmações acima e assumo total
          responsabilidade por qualquer omissão ou erro nas mesmas.
        </p>
        <Field id="signer_name" label="Nome completo do responsável (confirme como assinatura)" required />
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
        {pending ? "Enviando..." : "Assinar autorização"}
      </button>
    </form>
  );
}
