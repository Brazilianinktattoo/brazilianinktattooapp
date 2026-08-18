"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  recordPayment,
  setEnrollmentStatus,
  type PaymentFormState,
} from "@/app/actions/cursos";
import { generateCourseReceipt, type GenerateReceiptState } from "@/app/actions/course-receipts";
import { STATUS_LABELS, depositAmount, displayStatus } from "@/lib/cursos";
import type { CourseEnrollment, CoursePayment, CourseReceipt } from "@/lib/types/database";

const initialState: PaymentFormState = {};
const initialReceiptState: GenerateReceiptState = {};

function formatMoney(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ReceiptButton({
  paymentId,
  existing,
}: {
  paymentId: string;
  existing: CourseReceipt | undefined;
}) {
  const [state, formAction, pending] = useActionState(generateCourseReceipt, initialReceiptState);
  const [showLink, setShowLink] = useState(false);

  const token = state.token ?? existing?.access_token;
  const link = token && typeof window !== "undefined" ? `${window.location.origin}/recibo/${token}` : null;

  return (
    <div className="flex items-center gap-2">
      <form
        action={formAction}
        onSubmit={() => setShowLink(true)}
      >
        <input type="hidden" name="payment_id" value={paymentId} />
        <button
          type="submit"
          disabled={pending}
          className="text-xs text-neutral-400 hover:text-white disabled:opacity-60"
        >
          {pending ? "Gerando..." : existing ? "Ver recibo" : "Gerar recibo"}
        </button>
      </form>
      {(showLink || existing) && link && (
        <input
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          className="w-56 rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-100 outline-none"
        />
      )}
      {state.error && <span className="text-xs text-red-400">{state.error}</span>}
    </div>
  );
}

export function PaymentCard({
  enrollment,
  payments,
  priceTotal,
  depositPercentage,
  receiptByPayment,
}: {
  enrollment: CourseEnrollment;
  payments: CoursePayment[];
  priceTotal: number;
  depositPercentage: number;
  receiptByPayment: Record<string, CourseReceipt>;
}) {
  const [state, formAction, pending] = useActionState(recordPayment, initialState);
  const [statusPending, startStatusTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  const sinalPago = payments.filter((p) => p.type === "sinal").reduce((s, p) => s + p.amount, 0);
  const finalPago = payments.filter((p) => p.type === "final").reduce((s, p) => s + p.amount, 0);
  const sinalEsperado = depositAmount(priceTotal, depositPercentage);
  const saldo = Math.max(priceTotal - sinalPago - finalPago, 0);

  const status = displayStatus(enrollment);
  const holdsSeat = enrollment.status !== "desistente" && enrollment.status !== "lista_espera";
  const canWithdraw = holdsSeat;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-medium text-white">{enrollment.full_name}</div>
          <div className="text-sm text-neutral-400">
            {enrollment.email} · {enrollment.phone}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-300">
            {STATUS_LABELS[status]}
          </span>
          {canWithdraw && (
            <button
              type="button"
              disabled={statusPending}
              onClick={() => {
                if (confirm(`Marcar ${enrollment.full_name} como desistente?`)) {
                  startStatusTransition(() => setEnrollmentStatus(enrollment.id, "desistente"));
                }
              }}
              className="text-xs text-red-400 hover:text-red-300 disabled:opacity-60"
            >
              Marcar desistência
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <div className="text-neutral-500">Sinal esperado</div>
          <div className="text-neutral-200">{formatMoney(sinalEsperado)}</div>
        </div>
        <div>
          <div className="text-neutral-500">Sinal pago</div>
          <div className="text-neutral-200">{formatMoney(sinalPago)}</div>
        </div>
        <div>
          <div className="text-neutral-500">Pagamento final</div>
          <div className="text-neutral-200">{formatMoney(finalPago)}</div>
        </div>
        <div>
          <div className="text-neutral-500">Saldo devedor</div>
          <div className="text-neutral-200">{formatMoney(saldo)}</div>
        </div>
      </div>

      {payments.length > 0 && (
        <div className="mt-3 flex flex-col gap-2 border-t border-neutral-800 pt-3">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <span className="text-neutral-300">
                {p.type === "sinal" ? "Sinal" : "Pagamento final"} — {formatMoney(p.amount)}
              </span>
              <ReceiptButton paymentId={p.id} existing={receiptByPayment[p.id]} />
            </div>
          ))}
        </div>
      )}

      {enrollment.status !== "lista_espera" && enrollment.status !== "desistente" && (
        <form
          ref={formRef}
          action={formAction}
          className="mt-4 flex flex-wrap items-end gap-3 border-t border-neutral-800 pt-4"
        >
          <input type="hidden" name="enrollment_id" value={enrollment.id} />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-neutral-400">Tipo</label>
            <select
              name="type"
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
            >
              <option value="sinal">Sinal</option>
              <option value="final">Pagamento final</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-neutral-400">Valor (R$)</label>
            <input
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              required
              className="w-32 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-xs text-neutral-400">Observação (opcional)</label>
            <input
              name="notes"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 text-sm font-medium text-neutral-950 transition hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Registrando..." : "Registrar pagamento"}
          </button>
        </form>
      )}
      {state.error && <p className="mt-2 text-sm text-red-400">{state.error}</p>}
    </div>
  );
}
