"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  addJewelry,
  removeJewelry,
  type ComandaJewelryState,
} from "@/app/actions/comandas";
import type { ComandaJewelry as ComandaJewelryRow, JewelryCatalogItem } from "@/lib/types/database";

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const OPERATION_LABEL: Record<string, string> = {
  aplicada: "Aplicada",
  trocada: "Trocada",
  vendida: "Vendida",
};

const initialState: ComandaJewelryState = {};

function priceForOperation(item: JewelryCatalogItem, operation: string): number {
  if (operation === "aplicada") return item.price_aplicacao;
  if (operation === "trocada") return item.price_troca;
  return item.price_venda;
}

export function ComandaJewelry({
  comandaId,
  items,
  catalog,
  canEdit,
}: {
  comandaId: string;
  items: ComandaJewelryRow[];
  catalog: JewelryCatalogItem[];
  canEdit: boolean;
}) {
  const addAction = addJewelry.bind(null, comandaId);
  const [state, formAction, pending] = useActionState(addAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [, startTransition] = useTransition();

  const [catalogId, setCatalogId] = useState("");
  const [operation, setOperation] = useState("aplicada");
  const [value, setValue] = useState("0");
  const [lastState, setLastState] = useState(state);

  if (state !== lastState) {
    setLastState(state);
    if (!state.error) {
      setCatalogId("");
      setOperation("aplicada");
      setValue("0");
    }
  }

  useEffect(() => {
    if (!state.error) formRef.current?.reset();
  }, [state]);

  const total = items.reduce((sum, i) => sum + i.value, 0);

  function handleCatalogOrOperationChange(nextCatalogId: string, nextOperation: string) {
    setCatalogId(nextCatalogId);
    setOperation(nextOperation);
    const item = catalog.find((c) => c.id === nextCatalogId);
    if (item) setValue(String(priceForOperation(item, nextOperation)));
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
      <h2 className="font-semibold text-white">Jóias</h2>

      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhuma jóia lançada.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((i) => (
            <div
              key={i.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-neutral-800 px-3 py-2 text-sm"
            >
              <span className="text-neutral-200">
                {i.jewelry_name}{" "}
                <span className="text-neutral-500">
                  · {OPERATION_LABEL[i.operation] ?? i.operation}
                </span>
              </span>
              <div className="flex items-center gap-3">
                <span className="text-neutral-300">{formatMoney(i.value)}</span>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() =>
                      startTransition(() => removeJewelry(comandaId, i.id))
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
            <label htmlFor="jewelry_catalog_id" className="text-sm text-neutral-300">
              Jóia (catálogo, opcional)
            </label>
            <select
              id="jewelry_catalog_id"
              name="jewelry_catalog_id"
              value={catalogId}
              onChange={(e) => handleCatalogOrOperationChange(e.target.value, operation)}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
            >
              <option value="">Personalizada (digitar abaixo)</option>
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="jewelry_name" className="text-sm text-neutral-300">
              Tipo da jóia
            </label>
            <input
              id="jewelry_name"
              name="jewelry_name"
              required
              key={catalogId}
              placeholder="Ex: Argola titânio 8mm"
              defaultValue={catalog.find((c) => c.id === catalogId)?.name ?? ""}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="operation" className="text-sm text-neutral-300">
              Operação
            </label>
            <select
              id="operation"
              name="operation"
              value={operation}
              onChange={(e) => handleCatalogOrOperationChange(catalogId, e.target.value)}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
            >
              <option value="aplicada">Aplicada</option>
              <option value="trocada">Trocada</option>
              <option value="vendida">Vendida</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="value" className="text-sm text-neutral-300">
              Valor (R$)
            </label>
            <input
              id="value"
              name="value"
              type="number"
              min="0"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-28 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
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
