"use client";

import { useActionState, useRef } from "react";
import {
  updateMyPassword,
  type UpdateMyPasswordState,
} from "@/app/actions/account";

const initialState: UpdateMyPasswordState = {};

export function PasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(
    async (prevState: UpdateMyPasswordState, formData: FormData) => {
      const result = await updateMyPassword(prevState, formData);
      if (result.success) {
        formRef.current?.reset();
      }
      return result;
    },
    initialState
  );

  return (
    <form
      ref={formRef}
      action={action}
      className="flex max-w-sm flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="current_password" className="text-sm text-neutral-400">
          Senha atual
        </label>
        <input
          id="current_password"
          type="password"
          name="current_password"
          required
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="new_password" className="text-sm text-neutral-400">
          Nova senha
        </label>
        <input
          id="new_password"
          type="password"
          name="new_password"
          minLength={6}
          required
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="confirm_password" className="text-sm text-neutral-400">
          Confirmar nova senha
        </label>
        <input
          id="confirm_password"
          type="password"
          name="confirm_password"
          minLength={6}
          required
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-gradient-to-b from-gold-strong to-gold px-4 py-2 font-medium text-neutral-950 transition-colors hover:to-copper disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Salvar nova senha"}
      </button>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-green-400">Senha atualizada com sucesso.</p>
      )}
    </form>
  );
}
