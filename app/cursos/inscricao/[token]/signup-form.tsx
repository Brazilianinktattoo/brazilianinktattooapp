"use client";

import { useActionState } from "react";
import { submitCourseSignup, type CourseSignupState } from "@/app/actions/cursos";
import { WITHDRAWAL_CLAUSE } from "@/lib/cursos";

const initialState: CourseSignupState = {};

export function SignupForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    submitCourseSignup.bind(null, token),
    initialState
  );

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-green-800 bg-green-500/10 p-8 text-center">
        <h2 className="text-lg font-semibold text-green-300">
          {state.waitlisted ? "Inscrição recebida — lista de espera" : "Inscrição recebida!"}
        </h2>
        <p className="text-green-200/80">
          {state.waitlisted
            ? "A turma está com todas as vagas ocupadas no momento. Você entrou na lista de espera e será chamado assim que uma vaga abrir."
            : "O estúdio vai entrar em contato para combinar o pagamento do sinal e os próximos passos."}
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5"
    >
      <div className="rounded-lg border border-amber-800 bg-amber-500/10 p-3 text-sm text-amber-200">
        {WITHDRAWAL_CLAUSE}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="full_name" className="text-sm text-neutral-300">
          Nome completo
        </label>
        <input
          id="full_name"
          name="full_name"
          required
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm text-neutral-300">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="phone" className="text-sm text-neutral-300">
          Telefone
        </label>
        <input
          id="phone"
          name="phone"
          required
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cpf" className="text-sm text-neutral-300">
            CPF
          </label>
          <input
            id="cpf"
            name="cpf"
            required
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="rg" className="text-sm text-neutral-300">
            RG
          </label>
          <input
            id="rg"
            name="rg"
            required
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="address" className="text-sm text-neutral-300">
          Endereço completo
        </label>
        <input
          id="address"
          name="address"
          required
          placeholder="Rua, número, bairro, cidade"
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="state" className="text-sm text-neutral-300">
          Estado
        </label>
        <input
          id="state"
          name="state"
          required
          placeholder="Ex: RJ"
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 font-medium text-neutral-950 transition hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Enviar inscrição"}
      </button>
    </form>
  );
}
