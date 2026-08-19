"use client";

import { useActionState, useState } from "react";
import {
  submitAnamneseSignature,
  type AnamneseSignatureState,
} from "@/app/actions/anamnese";
import { ANAMNESE_HEALTH_QUESTIONS } from "@/lib/documents/anamnese-questions";

const initialState: AnamneseSignatureState = {};

const ORIGIN_OPTIONS = [
  {
    value: "trazido_pelo_tatuador",
    label: "Fui trazido(a) pelo tatuador(a)",
  },
  {
    value: "indicado_pelo_estudio",
    label: "Vim por indicação do estúdio (não trazido por um profissional específico)",
  },
  {
    value: "barra_shopping",
    label: "Meu atendimento é na unidade Barra Shopping",
  },
];

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

export function AnamneseForm({
  token,
  defaultName,
  defaultPhone,
}: {
  token: string;
  defaultName: string;
  defaultPhone: string;
}) {
  const [state, formAction, pending] = useActionState(
    submitAnamneseSignature.bind(null, token),
    initialState
  );
  const [isMinor, setIsMinor] = useState(false);

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-green-800 bg-green-500/10 p-8 text-center">
        <h2 className="text-lg font-semibold text-green-300">Ficha enviada!</h2>
        <p className="text-green-200/80">
          Obrigado por preencher. Qualquer dúvida, fale com seu tatuador(a) ou
          com a recepção.
        </p>
        {state.isMinor && state.minorAuthToken && (
          <a
            href={`/autorizacao-menor/${state.minorAuthToken}`}
            className="mt-2 rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 text-sm font-medium text-neutral-950 transition hover:to-copper"
          >
            Continuar para a Autorização do Responsável →
          </a>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="font-semibold text-white">1. Identificação do cliente</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="full_name" label="Nome completo" required defaultValue={defaultName} />
          <Field id="birth_date" label="Data de nascimento" type="date" required />
          <Field id="cpf" label="CPF" required />
          <Field id="rg" label="RG" required />
          <Field id="address" label="Endereço completo" required />
          <Field id="cep" label="CEP" required />
          <Field id="phone" label="Telefone" required defaultValue={defaultPhone} />
          <Field id="email" label="E-mail" type="email" required />
        </div>
        <div>
          <p className="text-sm text-neutral-300">Você é menor de idade? *</p>
          <div className="mt-2 flex items-center gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="is_minor"
                value="nao"
                defaultChecked
                onChange={() => setIsMinor(false)}
              />
              Não
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="is_minor"
                value="sim"
                onChange={() => setIsMinor(true)}
              />
              Sim
            </label>
          </div>
          {isMinor && (
            <p className="mt-2 text-xs text-amber-300">
              Ao enviar, você será direcionado(a) pra Autorização do
              Responsável Legal — ela precisa ser preenchida por um dos pais
              ou responsável.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="font-semibold text-white">2. Procedimento</h2>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-neutral-300">Tipo de procedimento *</span>
          <div className="flex items-center gap-4 text-sm">
            {[
              { v: "tatuagem", l: "Tatuagem" },
              { v: "piercing", l: "Piercing" },
              { v: "ambos", l: "Ambos" },
            ].map((opt) => (
              <label key={opt.v} className="flex items-center gap-1.5">
                <input type="radio" name="procedure_type" value={opt.v} required />
                {opt.l}
              </label>
            ))}
          </div>
        </div>
        <Field
          id="procedure_description"
          label="Descrição (desenho/estilo ou tipo e material da jóia)"
          required
        />
        <Field id="body_location" label="Localização no corpo" required />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="total_amount" className="text-sm text-neutral-300">
              Valor total do procedimento (R$)
            </label>
            <input
              id="total_amount"
              name="total_amount"
              type="number"
              min="0"
              step="0.01"
              required
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="deposit_amount" className="text-sm text-neutral-300">
              Valor do sinal (R$) — 0 se não houve sinal
            </label>
            <input
              id="deposit_amount"
              name="deposit_amount"
              type="number"
              min="0"
              step="0.01"
              defaultValue={0}
              required
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="font-semibold text-white">3. Declaração de saúde</h2>
        <p className="text-xs text-neutral-500">
          É obrigatório declarar informações verdadeiras sobre sua saúde.
        </p>
        {ANAMNESE_HEALTH_QUESTIONS.map((q) => (
          <HealthQuestion key={q.key} questionKey={q.key} label={q.label} />
        ))}
        <div className="rounded-lg border border-neutral-800 p-3">
          <p className="text-sm text-neutral-300">Está grávida ou amamentando?</p>
          <div className="mt-2 flex items-center gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input type="radio" name="pregnant" value="nao" defaultChecked required />
              Não
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" name="pregnant" value="sim" />
              Sim
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" name="pregnant" value="nao_se_aplica" />
              Não se aplica
            </label>
          </div>
        </div>
        <div className="rounded-lg border border-neutral-800 p-3">
          <p className="text-sm text-neutral-300">
            Ingeriu álcool ou substâncias que afinam o sangue nas últimas 24 horas?
          </p>
          <div className="mt-2 flex items-center gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input type="radio" name="alcohol_24h" value="nao" defaultChecked />
              Não
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" name="alcohol_24h" value="sim" />
              Sim
            </label>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="font-semibold text-white">4. Consentimento e origem</h2>
        <p className="text-sm text-neutral-400">
          Declaro estar ciente de que o procedimento envolve o rompimento da
          barreira natural da pele, com riscos inerentes de dor, edema,
          hematoma, sangramento, reação alérgica e infecção. Fui informado(a)
          sobre os cuidados pós-procedimento necessários e sobre a
          dificuldade do processo de remoção, quando aplicável. Declaro que
          as informações de saúde acima são verdadeiras e completas.
        </p>
        <div className="flex flex-col gap-2">
          {ORIGIN_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-start gap-2 rounded-lg border border-neutral-800 p-3 text-sm text-neutral-300 hover:border-neutral-600"
            >
              <input type="radio" name="client_origin" value={opt.value} required className="mt-1" />
              {opt.label}
            </label>
          ))}
        </div>
        <Field id="signer_name" label="Nome completo (confirme como assinatura)" required defaultValue={defaultName} />
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
