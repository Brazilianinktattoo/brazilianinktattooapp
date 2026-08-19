import type { CardFeeRate, PaymentMethod } from "@/lib/types/database";

export const INSTALLMENT_OPTIONS = Array.from({ length: 18 }, (_, i) => i + 1);

export function ratesToCurrentMap(rates: CardFeeRate[]): Map<string, CardFeeRate> {
  const map = new Map<string, CardFeeRate>();
  for (const rate of rates) {
    const key = `${rate.method}:${rate.installments}`;
    const existing = map.get(key);
    if (!existing || rate.effective_from > existing.effective_from) {
      map.set(key, rate);
    }
  }
  return map;
}

export function findCurrentRate(
  rates: CardFeeRate[],
  method: "debito" | "credito",
  installments: number
): CardFeeRate | null {
  let best: CardFeeRate | null = null;
  for (const rate of rates) {
    if (rate.method !== method || rate.installments !== installments) continue;
    if (!best || rate.effective_from > best.effective_from) best = rate;
  }
  return best;
}

export function feeRatePercentFor(
  rates: CardFeeRate[],
  method: PaymentMethod,
  installments: number
): number | null {
  if (method === "pix" || method === "dinheiro" || method === "paypal") return 0;
  const rate = findCurrentRate(rates, method, installments);
  return rate ? rate.rate_percent : null;
}

// A taxa da operadora é ACRESCIDA ao valor do serviço — o cliente paga o
// valor do serviço + a taxa (o estúdio recebe o valor cheio do serviço,
// sem descontar a taxa; é o cliente quem cobre o custo da maquininha).
export function computeChargedAmount(gross: number, ratePercent: number): number {
  return Math.round(gross * (1 + ratePercent / 100) * 100) / 100;
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  credito: "Crédito",
  debito: "Débito",
  pix: "Pix",
  dinheiro: "Dinheiro",
  paypal: "PayPal",
};
