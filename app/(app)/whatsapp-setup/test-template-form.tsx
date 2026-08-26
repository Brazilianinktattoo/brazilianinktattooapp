"use client";

import { useActionState } from "react";
import {
  sendTemplateTestMessage,
  type SendTemplateTestState,
} from "@/app/actions/whatsapp-setup";

const initialState: SendTemplateTestState = {};

export function TestTemplateForm() {
  const [state, formAction, pending] = useActionState(
    sendTemplateTestMessage,
    initialState
  );

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-3">
      <input
        type="tel"
        name="phone"
        placeholder="21999998888"
        required
        className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
      />
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-200 hover:border-gold-soft hover:text-gold disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Enviar teste via modelo (agendamento_criado_admin)"}
      </button>
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-green-400">Mensagem enviada!</p>
      )}
    </form>
  );
}
