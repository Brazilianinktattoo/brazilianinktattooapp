"use client";

import { useMemo, useState } from "react";
import type { CardFeeRate, PaymentMethod } from "@/lib/types/database";
import { computeChargedAmount, INSTALLMENT_OPTIONS, PAYMENT_METHOD_LABEL } from "@/lib/fees";

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const METHODS: PaymentMethod[] = ["credito", "debito", "pix", "dinheiro", "paypal"];

export function FeeCalculator({
  debitoRate,
  creditoRates,
}: {
  debitoRate: CardFeeRate | null;
  creditoRates: (CardFeeRate | null)[];
}) {
  const [gross, setGross] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [installments, setInstallments] = useState(1);

  const grossValue = Number(gross.replace(",", "."));

  const ratePercent = useMemo(() => {
    if (method === "pix" || method === "dinheiro" || method === "paypal") return 0;
    if (method === "debito") return debitoRate?.rate_percent ?? null;
    return creditoRates[installments - 1]?.rate_percent ?? null;
  }, [method, installments, debitoRate, creditoRates]);

  const hasValidGross = gross.trim() !== "" && !Number.isNaN(grossValue) && grossValue >= 0;
  const charged =
    hasValidGross && ratePercent !== null
      ? computeChargedAmount(grossValue, ratePercent)
      : null;
  const feeAmount = charged !== null ? Math.round((charged - grossValue) * 100) / 100 : null;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
      <h2 className="font-semibold text-white">Simulador de valor cobrado</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="gross" className="text-sm text-neutral-300">
            Valor bruto (R$)
          </label>
          <input
            id="gross"
            value={gross}
            onChange={(e) => setGross(e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="method" className="text-sm text-neutral-300">
            Forma de pagamento
          </label>
          <select
            id="method"
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
              value={installments}
              onChange={(e) => setInstallments(Number(e.target.value))}
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

      {hasValidGross && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 text-sm">
          {ratePercent === null ? (
            <p className="text-amber-400">
              Taxa não cadastrada para essa modalidade/parcela ainda.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-neutral-300">
              <span>
                Taxa: <span className="text-neutral-100">{ratePercent}%</span>
              </span>
              <span>
                Acréscimo da taxa:{" "}
                <span className="text-neutral-100">{money(feeAmount ?? 0)}</span>
              </span>
              <span>
                Valor cobrado do cliente:{" "}
                <span className="text-lg font-semibold text-green-400">
                  {money(charged ?? 0)}
                </span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
