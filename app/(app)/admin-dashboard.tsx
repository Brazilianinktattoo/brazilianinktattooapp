import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchDashboardData } from "@/lib/reports/dashboard";
import { SEGMENT_LABEL } from "@/lib/reports/fechamento";

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDueDate(iso: string) {
  const date = new Date(`${iso}T12:00:00Z`);
  const today = new Date(new Date().toDateString());
  const overdue = date < today;
  const label = date.toLocaleDateString("pt-BR");
  return { label, overdue };
}

export async function AdminDashboard() {
  const supabase = await createClient();
  const data = await fetchDashboardData(supabase);

  const totalMonthAppointments = data.monthByUnit.reduce((s, u) => s + u.count, 0);
  const segments = ["tatuagem", "piercing", "coworking", "curso"] as const;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Painel do Admin</h1>
        <p className="text-neutral-400">Visão geral do estúdio hoje.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-gold-soft/30 bg-neutral-900/40 p-5">
          <h2 className="font-semibold text-white">Atendimentos hoje</h2>
          <p className="mt-2 text-3xl font-semibold text-gold">
            {data.todayAppointments}
          </p>
          <Link
            href="/agenda"
            className="mt-2 inline-block text-sm text-neutral-400 hover:text-gold"
          >
            Ver agenda →
          </Link>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
          <h2 className="font-semibold text-white">Vendas hoje</h2>
          <p className="mt-2 text-3xl font-semibold text-neutral-100">
            {money(data.todaySummary.total)}
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            {segments
              .filter((s) => data.todaySummary.bySegment[s].count > 0)
              .map((s) => `${SEGMENT_LABEL[s]} ${money(data.todaySummary.bySegment[s].total)}`)
              .join(" · ") || "Nenhuma venda ainda"}
          </p>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
          <h2 className="font-semibold text-white">Agendamentos no mês</h2>
          <p className="mt-2 text-3xl font-semibold text-neutral-100">
            {totalMonthAppointments}
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            {data.monthByUnit.map((u) => `${u.unitName} ${u.count}`).join(" · ") || "—"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Contas a vencer</h2>
            <Link href="/contas-fixas" className="text-xs text-neutral-500 hover:text-gold">
              Ver todas →
            </Link>
          </div>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {data.billsDueSoon.map((b) => {
              const due = b.due_date ? formatDueDate(b.due_date) : null;
              return (
                <li key={b.id} className="flex items-center justify-between gap-2">
                  <span className="text-neutral-300">{b.name}</span>
                  <span className={due?.overdue ? "text-red-400" : "text-neutral-400"}>
                    {money(b.amount)} · {due?.label}
                    {due?.overdue ? " (vencida)" : ""}
                  </span>
                </li>
              );
            })}
          </ul>
          {data.billsDueSoon.length === 0 && (
            <p className="mt-3 text-sm text-neutral-500">Nada vencendo nos próximos dias.</p>
          )}
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
          <h2 className="font-semibold text-white">Aniversariantes de hoje</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {data.birthdaysToday.map((p) => (
              <li key={`${p.kind}-${p.id}`} className="flex items-center justify-between gap-2">
                <span className="text-neutral-300">{p.name}</span>
                <span className="text-xs text-neutral-500">
                  {p.kind === "colaborador" ? "Colaborador(a)" : "Cliente"}
                </span>
              </li>
            ))}
          </ul>
          {data.birthdaysToday.length === 0 && (
            <p className="mt-3 text-sm text-neutral-500">Ninguém faz aniversário hoje.</p>
          )}
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Estoque baixo</h2>
            <Link href="/estoque" className="text-xs text-neutral-500 hover:text-gold">
              Ver estoque →
            </Link>
          </div>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {data.lowStock.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <span className="text-neutral-300">{p.name}</span>
                <span className="text-amber-400">
                  {p.quantity} / mín. {p.min_stock}
                </span>
              </li>
            ))}
          </ul>
          {data.lowStock.length === 0 && (
            <p className="mt-3 text-sm text-neutral-500">Estoque tranquilo, nada em baixa.</p>
          )}
        </div>
      </div>
    </div>
  );
}
