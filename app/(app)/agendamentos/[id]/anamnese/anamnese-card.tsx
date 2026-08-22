"use client";

import { useActionState, useState } from "react";
import {
  generateAnamneseForm,
  getAnamnesePdfUrl,
  type GenerateAnamneseState,
} from "@/app/actions/anamnese";
import { STUDIO_TZ } from "@/lib/date";
import type { AnamneseForm, MinorAuthorizationForm } from "@/lib/types/database";

const ORIGIN_LABEL: Record<string, string> = {
  trazido_pelo_tatuador: "Trazido pelo tatuador (comissão 70%)",
  indicado_pelo_estudio: "Indicado pelo estúdio (comissão 50%)",
  barra_shopping: "Atendimento no Barra Shopping (comissão 50% fixo)",
};

const initialState: GenerateAnamneseState = {};

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

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

export function AnamneseCard({
  appointmentId,
  clientName,
  form,
  minorAuth,
  canGenerate,
}: {
  appointmentId: string;
  clientName: string;
  form: AnamneseForm | null;
  minorAuth: MinorAuthorizationForm | null;
  canGenerate: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    generateAnamneseForm,
    initialState
  );
  const [pdfLoading, setPdfLoading] = useState(false);

  const link =
    state.success && state.token && typeof window !== "undefined"
      ? `${window.location.origin}/anamnese/${state.token}`
      : form && !form.signed_at && typeof window !== "undefined"
        ? `${window.location.origin}/anamnese/${form.sign_token}`
        : null;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-medium text-white">{clientName}</div>
          <div className="text-sm text-neutral-400">Ficha de anamnese</div>
        </div>
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

      {form?.signed_at && form.client_origin && (
        <p className="mt-3 text-sm text-neutral-300">
          Origem do cliente:{" "}
          <span className="text-neutral-100">
            {ORIGIN_LABEL[form.client_origin] ?? form.client_origin}
          </span>
        </p>
      )}
      {form?.signed_at && (
        <p className="mt-1 text-sm text-neutral-300">
          Valor total: <span className="text-neutral-100">{formatMoney(form.total_amount)}</span>
          {" · "}
          Sinal: <span className="text-neutral-100">{formatMoney(form.deposit_amount)}</span>
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-neutral-800 pt-4">
        {canGenerate && !form?.signed_at && (
          <form action={formAction}>
            <input type="hidden" name="appointment_id" value={appointmentId} />
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 text-sm font-medium text-neutral-950 transition hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Gerando..." : form ? "Ver link novamente" : "Gerar ficha"}
            </button>
          </form>
        )}
        {form?.file_path && (
          <button
            type="button"
            disabled={pdfLoading}
            onClick={async () => {
              setPdfLoading(true);
              const url = await getAnamnesePdfUrl(form.file_path!);
              setPdfLoading(false);
              if (url) window.open(url, "_blank");
            }}
            className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-200 hover:border-neutral-500 disabled:opacity-60"
          >
            {pdfLoading ? "Abrindo..." : "Ver PDF"}
          </button>
        )}
      </div>

      {state.error && <p className="mt-2 text-sm text-red-400">{state.error}</p>}

      {form?.is_minor && (
        <div className="mt-3 rounded-lg border border-amber-800 bg-amber-500/10 p-3">
          <p className="text-sm text-amber-300">
            Cliente é menor de idade — Autorização do Responsável Legal{" "}
            {minorAuth?.signed_at ? "assinada" : "pendente"}.
          </p>
          {minorAuth && !minorAuth.signed_at && typeof window !== "undefined" && (
            <input
              readOnly
              value={`${window.location.origin}/autorizacao-menor/${minorAuth.sign_token}`}
              onFocus={(e) => e.currentTarget.select()}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none"
            />
          )}
        </div>
      )}

      {link && (
        <div className="mt-3 rounded-lg border border-green-800 bg-green-500/10 p-3">
          <p className="text-sm text-green-300">
            Link de preenchimento — envie para o cliente:
          </p>
          <input
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none"
          />
        </div>
      )}
    </div>
  );
}
