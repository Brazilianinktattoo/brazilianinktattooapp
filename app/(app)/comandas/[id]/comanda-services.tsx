"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  addService,
  removeService,
  type ComandaServiceState,
} from "@/app/actions/comandas";
import type { ComandaService, Service } from "@/lib/types/database";

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const initialState: ComandaServiceState = {};

export function ComandaServices({
  comandaId,
  services,
  catalog,
  canEdit,
}: {
  comandaId: string;
  services: ComandaService[];
  catalog: Service[];
  canEdit: boolean;
}) {
  const addAction = addService.bind(null, comandaId);
  const [state, formAction, pending] = useActionState(addAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [, startTransition] = useTransition();
  const [catalogId, setCatalogId] = useState("");
  const [price, setPrice] = useState("0");
  const [lastState, setLastState] = useState(state);

  if (state !== lastState) {
    setLastState(state);
    if (!state.error) {
      setCatalogId("");
      setPrice("0");
    }
  }

  useEffect(() => {
    if (!state.error) formRef.current?.reset();
  }, [state]);

  function handleCatalogChange(nextId: string) {
    setCatalogId(nextId);
    const item = catalog.find((c) => c.id === nextId);
    if (item) setPrice(String(item.price));
  }

  const total = services.reduce((sum, s) => sum + s.price, 0);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
      <h2 className="font-semibold text-white">Serviços</h2>

      {services.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhum serviço lançado.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {services.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-neutral-800 px-3 py-2 text-sm"
            >
              <span className="text-neutral-200">{s.description}</span>
              <div className="flex items-center gap-3">
                <span className="text-neutral-300">{formatMoney(s.price)}</span>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() =>
                      startTransition(() => removeService(comandaId, s.id))
                    }
                    className="text-red-400 hover:text-red-300"
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>
          ))}
          <div className="flex justify-end text-sm text-neutral-400">
            Subtotal: {formatMoney(total)}
          </div>
        </div>
      )}

      {canEdit && (
        <form
          ref={formRef}
          action={formAction}
          className="flex flex-wrap items-end gap-3 border-t border-neutral-800 pt-3"
        >
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="service_id" className="text-sm text-neutral-300">
              Do catálogo (opcional)
            </label>
            <select
              id="service_id"
              name="service_id"
              value={catalogId}
              onChange={(e) => handleCatalogChange(e.target.value)}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
            >
              <option value="">Personalizado (digitar abaixo)</option>
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {formatMoney(c.price)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="description" className="text-sm text-neutral-300">
              Serviço
            </label>
            <input
              id="description"
              name="description"
              required
              key={catalogId}
              placeholder="Ex: Sessão de tatuagem"
              defaultValue={catalog.find((c) => c.id === catalogId)?.name ?? ""}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="price" className="text-sm text-neutral-300">
              Valor (R$)
            </label>
            <input
              id="price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-32 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 font-medium text-neutral-950 transition hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Adicionando..." : "Adicionar"}
          </button>
          {state.error && (
            <p className="w-full text-sm text-red-400">{state.error}</p>
          )}
        </form>
      )}
    </div>
  );
}
