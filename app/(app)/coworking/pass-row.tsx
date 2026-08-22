"use client";

import { useState, useTransition } from "react";
import { reportRevenue, revokePass } from "@/app/actions/coworking";
import { STUDIO_TZ } from "@/lib/date";
import type { CoworkingPassWithRelations } from "@/lib/types/database";

function formatMoney(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: STUDIO_TZ,
  });
}

const PERIOD_LABEL: Record<string, string> = {
  hora: "hora",
  dia: "dia",
  semana: "semana",
};

export function PassRow({ pass }: { pass: CoworkingPassWithRelations }) {
  const [revenue, setRevenue] = useState(pass.reported_revenue);
  const [pending, startTransition] = useTransition();
  const [link, setLink] = useState<string | null>(null);
  // lazy initializer: lido uma única vez na montagem, não a cada render —
  // evita a regra de pureza (Date.now direto no corpo do componente)
  const [now] = useState(() => Date.now());

  const started = now >= new Date(pass.starts_at).getTime();
  const ended = now > new Date(pass.ends_at).getTime();
  const status = ended ? "Expirado" : started ? "Em andamento" : "Agendado";

  const rentalTotal = pass.fixed_fee + (revenue * pass.percentage) / 100;

  return (
    <tr className="border-b border-neutral-800 align-top">
      <td className="py-3 pl-4 pr-4">
        <div className="text-neutral-100">{pass.guest_name}</div>
        {pass.guest_contact && (
          <div className="text-xs text-neutral-500">{pass.guest_contact}</div>
        )}
        <button
          type="button"
          onClick={() => {
            const url = `${window.location.origin}/coworking/entrar/${pass.token}`;
            setLink((v) => (v ? null : url));
          }}
          className="mt-1 text-xs text-neutral-500 hover:text-white"
        >
          {link ? "Ocultar link" : "Ver link"}
        </button>
        {link && (
          <input
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-1 w-56 rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-100 outline-none"
          />
        )}
      </td>
      <td className="py-3 pr-4 text-neutral-300">
        {pass.unit?.name ?? "—"} · {pass.maca?.label ?? "—"}
      </td>
      <td className="py-3 pr-4 text-neutral-300 whitespace-nowrap">
        {formatWhen(pass.starts_at)} – {formatWhen(pass.ends_at)}
      </td>
      <td className="py-3 pr-4">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            status === "Expirado"
              ? "bg-neutral-700/40 text-neutral-400"
              : status === "Em andamento"
                ? "bg-green-500/15 text-green-400"
                : "bg-amber-500/15 text-amber-400"
          }`}
        >
          {status}
        </span>
      </td>
      <td className="py-3 pr-4 text-neutral-300">
        {formatMoney(pass.fixed_fee)} / {PERIOD_LABEL[pass.fixed_fee_period]}
        <div className="text-xs text-neutral-500">{pass.percentage}%</div>
      </td>
      <td className="py-3 pr-4">
        <input
          type="number"
          min="0"
          step="0.01"
          value={revenue}
          disabled={pending}
          onChange={(e) => setRevenue(Number(e.target.value))}
          onBlur={() => {
            if (revenue !== pass.reported_revenue) {
              startTransition(() => reportRevenue(pass.id, revenue));
            }
          }}
          className="w-28 rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-neutral-100 outline-none focus:border-gold disabled:opacity-60"
        />
        <div className="mt-1 text-xs text-neutral-500">
          locação: {formatMoney(rentalTotal)}
        </div>
      </td>
      <td className="py-3 pr-4">
        {!ended && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (confirm(`Revogar o acesso de ${pass.guest_name} agora?`)) {
                startTransition(() => revokePass(pass.id));
              }
            }}
            className="text-red-400 hover:text-red-300 disabled:opacity-60"
          >
            Revogar
          </button>
        )}
      </td>
    </tr>
  );
}
