"use client";

import { useActionState } from "react";
import {
  registerWhatsAppNumber,
  type RegisterNumberState,
} from "@/app/actions/whatsapp-setup";

const initialState: RegisterNumberState = {};

export function RegisterNumberForm() {
  const [state, formAction, pending] = useActionState(
    registerWhatsAppNumber,
    initialState
  );

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-3">
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-gradient-to-b from-gold-strong to-gold px-4 py-2 text-sm font-medium text-neutral-950 transition hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Registrando..." : "Registrar número"}
      </button>
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-green-400">Número registrado com sucesso!</p>
      )}
    </form>
  );
}
