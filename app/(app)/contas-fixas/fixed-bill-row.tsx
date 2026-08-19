"use client";

import { useState, useTransition } from "react";
import { updateFixedBill, deleteFixedBill } from "@/app/actions/fixed-bills";
import type { FixedBill } from "@/lib/types/database";

export function FixedBillRow({ bill }: { bill: FixedBill }) {
  const [name, setName] = useState(bill.name);
  const [amount, setAmount] = useState(bill.amount);
  const [dueDate, setDueDate] = useState(bill.due_date ?? "");
  const [paidDate, setPaidDate] = useState(bill.paid_date ?? "");
  const [pending, startTransition] = useTransition();

  const overdue =
    !paidDate && dueDate && new Date(dueDate) < new Date(new Date().toDateString());

  return (
    <tr className={`border-b border-neutral-800 ${overdue ? "bg-red-500/5" : ""}`}>
      <td className="py-3 pl-4 pr-4">
        <input
          value={name}
          disabled={pending}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            if (name.trim() && name !== bill.name) {
              startTransition(() => updateFixedBill(bill.id, { name: name.trim() }));
            }
          }}
          className="w-40 rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-neutral-100 outline-none hover:border-neutral-700 focus:border-gold focus:bg-neutral-900 disabled:opacity-60"
        />
      </td>
      <td className="py-3 pr-4">
        <input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          disabled={pending}
          onChange={(e) => setAmount(Number(e.target.value))}
          onBlur={() => {
            if (amount !== bill.amount) {
              startTransition(() => updateFixedBill(bill.id, { amount }));
            }
          }}
          className="w-28 rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-neutral-100 outline-none focus:border-gold disabled:opacity-60"
        />
      </td>
      <td className="py-3 pr-4">
        <input
          type="date"
          value={dueDate}
          disabled={pending}
          onChange={(e) => setDueDate(e.target.value)}
          onBlur={() => {
            if (dueDate !== (bill.due_date ?? "")) {
              startTransition(() =>
                updateFixedBill(bill.id, { due_date: dueDate || null })
              );
            }
          }}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 outline-none focus:border-gold [color-scheme:dark] disabled:opacity-60"
        />
      </td>
      <td className="py-3 pr-4">
        <input
          type="date"
          value={paidDate}
          disabled={pending}
          onChange={(e) => setPaidDate(e.target.value)}
          onBlur={() => {
            if (paidDate !== (bill.paid_date ?? "")) {
              startTransition(() =>
                updateFixedBill(bill.id, { paid_date: paidDate || null })
              );
            }
          }}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 outline-none focus:border-gold [color-scheme:dark] disabled:opacity-60"
        />
      </td>
      <td className="py-3 pr-4">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm(`Excluir a conta "${bill.name}"?`)) {
              startTransition(() => deleteFixedBill(bill.id));
            }
          }}
          className="text-neutral-500 hover:text-red-400 disabled:opacity-60"
        >
          Excluir
        </button>
      </td>
    </tr>
  );
}
