import { shiftDate } from "@/lib/date";
import type { PaymentMethod } from "@/lib/types/database";

function studioDateParam(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

// Prazo de exigibilidade da comissão, contado a partir do pagamento do
// cliente (fechamento da comanda): Pix/Débito/Dinheiro vencem às 18h do
// dia seguinte; Crédito/PayPal (processadora externa segura o repasse)
// vencem 48h depois.
export function computeCommissionDeadline(
  paymentMethod: PaymentMethod,
  paidAt: Date
): Date {
  if (paymentMethod === "credito" || paymentMethod === "paypal") {
    return new Date(paidAt.getTime() + 48 * 60 * 60 * 1000);
  }
  const nextDayParam = shiftDate(studioDateParam(paidAt), 1);
  return new Date(`${nextDayParam}T18:00:00-03:00`);
}
