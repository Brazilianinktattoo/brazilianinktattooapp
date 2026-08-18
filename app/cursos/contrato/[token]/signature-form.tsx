"use client";

import { useActionState } from "react";
import { submitContractSignature, type SignatureState } from "@/app/actions/cursos";

const initialState: SignatureState = {};

export function SignatureForm({
  token,
  defaultName,
}: {
  token: string;
  defaultName: string;
}) {
  const [state, formAction, pending] = useActionState(
    submitContractSignature.bind(null, token),
    initialState
  );

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-green-800 bg-green-500/10 p-8 text-center">
        <h2 className="text-lg font-semibold text-green-300">Contrato assinado!</h2>
        <p className="text-green-200/80">
          Recebemos sua assinatura. Uma cópia fica arquivada no seu cadastro —
          o estúdio vai entrar em contato com os próximos passos.
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="signer_name" className="text-sm text-neutral-300">
          Nome completo (confirme como assinatura)
        </label>
        <input
          id="signer_name"
          name="signer_name"
          required
          defaultValue={defaultName}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>

      <label className="flex items-start gap-2 text-sm text-neutral-300">
        <input type="checkbox" name="agree" required className="mt-1" />
        Li e concordo com os termos do contrato acima, incluindo a cláusula de
        arrependimento de 7 dias corridos.
      </label>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 font-medium text-neutral-950 transition hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Assinando..." : "Assinar contrato"}
      </button>
    </form>
  );
}
