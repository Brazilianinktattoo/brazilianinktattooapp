"use client";

import { useActionState, useState } from "react";
import { closeComanda, type CloseComandaState } from "@/app/actions/comandas";
import { INSTALLMENT_OPTIONS, PAYMENT_METHOD_LABEL } from "@/lib/fees";
import type { PaymentMethod } from "@/lib/types/database";

const initialState: CloseComandaState = {};
const METHODS: PaymentMethod[] = ["credito", "debito", "pix", "dinheiro", "paypal"];

export function CloseComandaForm({
  comandaId,
  alreadyClosed = false,
  defaultMethod = "pix",
  defaultInstallments = 1,
}: {
  comandaId: string;
  alreadyClosed?: boolean;
  defaultMethod?: PaymentMethod;
  defaultInstallments?: number;
}) {
  const [open, setOpen] = useState(false);
  const closeWithId = closeComanda.bind(null, comandaId);
  const [state, formAction, pending] = useActionState(closeWithId, initialState);
  const [method, setMethod] = useState<PaymentMethod>(defaultMethod);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 font-medium text-neutral-950 transition hover:to-copper"
      >
        {alreadyClosed ? "Recalcular fechamento" : "Fechar comanda"}
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="payment_method" className="text-sm text-neutral-300">
            Forma de pagamento
          </label>
          <select
            id="payment_method"
            name="payment_method"
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABEL[m]}
              </option>
            ))}
          </select>
        </div>
        {method === "credito" && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="installments" className="text-sm text-neutral-300">
              Parcelas
            </label>
            <select
              id="installments"
              name="installments"
              defaultValue={defaultInstallments}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
            >
              {INSTALLMENT_OPTIONS.map((i) => (
                <option key={i} value={i}>
                  {i}x
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {alreadyClosed && (
        <p className="text-xs text-amber-300">
          Essa comanda já está fechada — confirmar aqui recalcula o total
          e a comissão com os itens atuais, mantendo (ou trocando, se você
          mudar acima) a forma de pagamento.
        </p>
      )}

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 text-sm font-medium text-neutral-950 transition hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Salvando..." : alreadyClosed ? "Confirmar recálculo" : "Confirmar fechamento"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-neutral-400 hover:text-white"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
