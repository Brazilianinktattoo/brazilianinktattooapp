"use client";

import { useState } from "react";

export function NewComandaQuickForm() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 text-sm font-medium text-neutral-950 transition hover:to-copper"
      >
        + Abrir comanda
      </button>
    );
  }

  return (
    <form
      action="/comandas/abrir"
      method="GET"
      className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 sm:flex-row sm:items-end"
    >
      <div className="flex flex-1 flex-col gap-1.5">
        <label htmlFor="quick_client_name" className="text-sm text-neutral-300">
          Nome do cliente
        </label>
        <input
          id="quick_client_name"
          name="client_name"
          required
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <label htmlFor="quick_client_phone" className="text-sm text-neutral-300">
          Telefone
        </label>
        <input
          id="quick_client_phone"
          name="client_phone"
          required
          placeholder="Ex: 11 95550-1001"
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 text-sm font-medium text-neutral-950 transition hover:to-copper"
        >
          Continuar
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
