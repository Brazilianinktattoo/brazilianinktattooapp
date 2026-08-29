"use client";

import { useActionState, useState } from "react";
import {
  submitLobuloplastiaSignature,
  type LobuloplastiaSignatureState,
} from "@/app/actions/lobuloplastia";
import { LOBULOPLASTIA_HEALTH_QUESTIONS } from "@/lib/documents/lobuloplastia-questions";

const initialState: LobuloplastiaSignatureState = {};

function Field({
  id,
  label,
  type = "text",
  required = false,
  defaultValue,
}: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
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
        defaultValue={defaultValue}
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
            placeholder="Qual(is)?"
            className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100 outline-none focus:border-gold"
          />
        )}
      </div>
    </div>
  );
}

export function LobuloplastiaFormComponent({
  token,
  defaultName,
  defaultPhone,
  consentText,
}: {
  token: string;
  defaultName: string;
  defaultPhone: string;
  consentText: string;
}) {
  const [state, formAction, pending] = useActionState(
    submitLobuloplastiaSignature.bind(null, token),
    initialState
  );

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-green-800 bg-green-500/10 p-8 text-center">
        <h2 className="text-lg font-semibold text-green-300">Ficha enviada!</h2>
        <p className="text-green-200/80">
          Obrigado por preencher. Qualquer dúvida, fale com a equipe do estúdio.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="font-semibold text-white">1. Dados pessoais</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="full_name" label="Nome completo" required defaultValue={defaultName} />
          <Field id="birth_date" label="Data de nascimento" type="date" />
          <Field id="rg" label="RG" />
          <Field id="cpf" label="CPF" />
          <Field id="phone" label="Telefone" required defaultValue={defaultPhone} />
          <Field id="social_media" label="Rede social" />
          <Field id="address" label="Endereço" />
          <Field id="city" label="Cidade" />
          <Field id="cep" label="CEP" />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="font-semibold text-white">2. Anamnese</h2>
        <p className="text-sm text-neutral-400">
          Para sua segurança, é obrigatório declarar informações verdadeiras
          sobre sua saúde.
        </p>
        <div className="flex flex-col gap-2">
          {LOBULOPLASTIA_HEALTH_QUESTIONS.map((q) => (
            <HealthQuestion key={q.key} questionKey={q.key} label={q.label} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="font-semibold text-white">3. Dados do procedimento</h2>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fenda_description" className="text-sm text-neutral-300">
            Descrição e localização da fenda (se souber — pode deixar em branco)
          </label>
          <textarea
            id="fenda_description"
            name="fenda_description"
            rows={2}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="font-semibold text-white">4. Termo de consentimento</h2>
        <p className="text-sm leading-relaxed text-neutral-300">{consentText}</p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="font-semibold text-white">5. Uso de imagem</h2>
        <label className="flex items-start gap-2 text-sm text-neutral-300">
          <input type="checkbox" name="image_authorization" className="mt-1" />
          Autorizo o uso da minha imagem pessoal para fins de divulgação.
        </label>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
        <Field id="signer_name" label="Assinatura (digite seu nome completo)" required />
        <label className="flex items-start gap-2 text-sm text-neutral-300">
          <input type="checkbox" name="agree" required className="mt-1" />
          Declaro que as informações acima são verdadeiras e completas.
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
