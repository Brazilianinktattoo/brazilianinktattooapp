"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { createPass, type CreatePassState } from "@/app/actions/coworking";
import type { Maca, Unit } from "@/lib/types/database";

const initialState: CreatePassState = {};

export function NewPassForm({
  units,
  macas,
}: {
  units: Unit[];
  macas: Maca[];
}) {
  const [state, formAction, pending] = useActionState(createPass, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [unitId, setUnitId] = useState("");

  const macasInUnit = useMemo(
    () => macas.filter((m) => m.unit_id === unitId),
    [macas, unitId]
  );

  // `state.success`/`state.token` só viram verdadeiros depois de uma
  // submissão real no navegador, então ler window aqui nunca roda durante o
  // render inicial no servidor (evita mismatch de hidratação sem precisar
  // de estado/efeito só pra isso).
  const link =
    state.success && state.token && typeof window !== "undefined"
      ? `${window.location.origin}/coworking/entrar/${state.token}`
      : null;
  const anamneseLink =
    state.success && state.anamneseToken && typeof window !== "undefined"
      ? `${window.location.origin}/anamnese-coworking/${state.anamneseToken}`
      : null;

  useEffect(() => {
    // Reset imperativo de DOM/estado local após um envio bem-sucedido — a
    // regra react-hooks/set-state-in-effect prefere isto fora de um efeito,
    // mas aqui é exatamente o caso de sincronizar com o resultado de uma
    // Server Action, que não tem outro gatilho além do próprio `state`.
    if (state.success) {
      formRef.current?.reset();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnitId("");
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 sm:grid-cols-2"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="guest_name" className="text-sm text-neutral-300">
          Nome do visitante
        </label>
        <input
          id="guest_name"
          name="guest_name"
          required
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="guest_contact" className="text-sm text-neutral-300">
          Contato (opcional)
        </label>
        <input
          id="guest_contact"
          name="guest_contact"
          placeholder="Telefone / Instagram / e-mail"
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="unit_id" className="text-sm text-neutral-300">
          Unidade
        </label>
        <select
          id="unit_id"
          name="unit_id"
          required
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        >
          <option value="" disabled>
            Selecione...
          </option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="maca_id" className="text-sm text-neutral-300">
          Maca
        </label>
        <select
          id="maca_id"
          name="maca_id"
          required
          disabled={!unitId}
          defaultValue=""
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold disabled:opacity-60"
        >
          <option value="" disabled>
            Selecione...
          </option>
          {macasInUnit.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="starts_at" className="text-sm text-neutral-300">
          Início do período
        </label>
        <input
          id="starts_at"
          name="starts_at"
          type="datetime-local"
          required
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold [color-scheme:dark]"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ends_at" className="text-sm text-neutral-300">
          Fim do período
        </label>
        <input
          id="ends_at"
          name="ends_at"
          type="datetime-local"
          required
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold [color-scheme:dark]"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="fixed_fee" className="text-sm text-neutral-300">
          Valor fixo (R$)
        </label>
        <input
          id="fixed_fee"
          name="fixed_fee"
          type="number"
          min="0"
          step="0.01"
          defaultValue={0}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="fixed_fee_period" className="text-sm text-neutral-300">
          Cobrado por
        </label>
        <select
          id="fixed_fee_period"
          name="fixed_fee_period"
          defaultValue="dia"
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        >
          <option value="hora">Hora</option>
          <option value="dia">Dia</option>
          <option value="semana">Semana</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="percentage" className="text-sm text-neutral-300">
          Percentual sobre o faturamento do visitante (%)
        </label>
        <input
          id="percentage"
          name="percentage"
          type="number"
          min="0"
          max="100"
          step="0.1"
          defaultValue={0}
          className="w-40 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="anamnese_language" className="text-sm text-neutral-300">
          Idioma da ficha de anamnese
        </label>
        <select
          id="anamnese_language"
          name="anamnese_language"
          defaultValue="portugues"
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        >
          <option value="portugues">Português</option>
          <option value="ingles">Inglês</option>
          <option value="espanhol">Espanhol</option>
        </select>
      </div>

      <div className="sm:col-span-2 flex items-center justify-between gap-3">
        {state.error && <p className="text-sm text-red-400">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="ml-auto rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 font-medium text-neutral-950 transition hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Gerando..." : "Gerar acesso"}
        </button>
      </div>

      {link && (
        <div className="sm:col-span-2 rounded-lg border border-green-800 bg-green-500/10 p-3">
          <p className="text-sm text-green-300">
            Acesso criado! Envie este link pro visitante:
          </p>
          <div className="mt-1 flex items-center gap-2">
            <input
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none"
            />
          </div>
          {anamneseLink && (
            <>
              <p className="mt-3 text-sm text-green-300">
                Link da ficha de anamnese (assinatura do visitante):
              </p>
              <div className="mt-1 flex items-center gap-2">
                <input
                  readOnly
                  value={anamneseLink}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none"
                />
              </div>
            </>
          )}
        </div>
      )}
    </form>
  );
}
