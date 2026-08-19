import Link from "next/link";
import { requireAdminOrChefePiercing } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rangeBounds, monthStartParam, todayParam } from "@/lib/date";
import type { Profile } from "@/lib/types/database";
import { RentalIncomeReport } from "./rental-income-report";

function formatMoney(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type ApptRow = {
  id: string;
  collaborator_id: string;
  status: string;
  collaborator: { role: string } | null;
};

type ComandaRow = {
  id: string;
  collaborator_id: string;
  collaborator: { role: string } | null;
  comanda_services: { price: number }[];
  comanda_products: { quantity: number; unit_price: number }[];
};

export default async function RelatoriosPage(props: PageProps<"/relatorios">) {
  const searchParams = await props.searchParams;
  const { profile } = await requireAdminOrChefePiercing();

  const from =
    typeof searchParams.from === "string" ? searchParams.from : monthStartParam();
  const to = typeof searchParams.to === "string" ? searchParams.to : todayParam();
  const { start, end } = rangeBounds(from, to);

  const supabase = await createClient();

  const [{ data: piercers }, { data: appts }, { data: comandas }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .in("role", ["piercer", "chefe_piercing"])
        .order("full_name")
        .returns<Profile[]>(),
      supabase
        .from("appointments")
        .select(
          "id, collaborator_id, status, collaborator:profiles!appointments_collaborator_id_fkey(role)"
        )
        .gte("starts_at", start.toISOString())
        .lt("starts_at", end.toISOString())
        .returns<ApptRow[]>(),
      supabase
        .from("comandas")
        .select(
          "id, collaborator_id, collaborator:profiles!comandas_collaborator_id_fkey(role), comanda_services(price), comanda_products(quantity, unit_price)"
        )
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString())
        .returns<ComandaRow[]>(),
    ]);

  type Row = {
    id: string;
    full_name: string;
    appointments: number;
    comandas: number;
    servicesTotal: number;
    productsTotal: number;
  };

  const rows = new Map<string, Row>();
  for (const p of piercers ?? []) {
    rows.set(p.id, {
      id: p.id,
      full_name: p.full_name || "Sem nome",
      appointments: 0,
      comandas: 0,
      servicesTotal: 0,
      productsTotal: 0,
    });
  }
  const isPiercingRole = (role: string | undefined) =>
    role === "piercer" || role === "chefe_piercing";

  for (const a of appts ?? []) {
    if (!isPiercingRole(a.collaborator?.role) || a.status !== "confirmado") continue;
    const row = rows.get(a.collaborator_id);
    if (row) row.appointments += 1;
  }
  for (const c of comandas ?? []) {
    if (!isPiercingRole(c.collaborator?.role)) continue;
    const row = rows.get(c.collaborator_id);
    if (!row) continue;
    row.comandas += 1;
    row.servicesTotal += (c.comanda_services ?? []).reduce(
      (s, x) => s + x.price,
      0
    );
    row.productsTotal += (c.comanda_products ?? []).reduce(
      (s, x) => s + x.quantity * x.unit_price,
      0
    );
  }

  const list = Array.from(rows.values());
  const grandTotal = list.reduce(
    (s, r) => s + r.servicesTotal + r.productsTotal,
    0
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Relatórios</h1>
        <p className="text-neutral-400">
          Atendimento e faturamento de serviço/venda por body piercer.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="from" className="text-sm text-neutral-300">
            De
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={from}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold [color-scheme:dark]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="to" className="text-sm text-neutral-300">
            Até
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={to}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold [color-scheme:dark]"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg border border-neutral-700 px-4 py-2 text-neutral-300 hover:border-gold-soft hover:text-gold"
        >
          Filtrar
        </button>
      </form>

      <div>
        <h2 className="mb-3 font-semibold text-white">Body Piercing</h2>
        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-gold-soft/20 text-neutral-500">
                <th className="py-3 pl-4 pr-4 font-medium">Body Piercer</th>
                <th className="py-3 pr-4 font-medium">Atendimentos</th>
                <th className="py-3 pr-4 font-medium">Comandas</th>
                <th className="py-3 pr-4 font-medium">Serviços</th>
                <th className="py-3 pr-4 font-medium">Produtos</th>
                <th className="py-3 pr-4 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-b border-neutral-800">
                  <td className="py-3 pl-4 pr-4 text-neutral-100">
                    {r.full_name}
                  </td>
                  <td className="py-3 pr-4 text-neutral-300">
                    {r.appointments}
                  </td>
                  <td className="py-3 pr-4 text-neutral-300">{r.comandas}</td>
                  <td className="py-3 pr-4 text-neutral-300">
                    {formatMoney(r.servicesTotal)}
                  </td>
                  <td className="py-3 pr-4 text-neutral-300">
                    {formatMoney(r.productsTotal)}
                  </td>
                  <td className="py-3 pr-4 font-medium text-white">
                    {formatMoney(r.servicesTotal + r.productsTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && (
            <p className="p-6 text-center text-neutral-500">
              Nenhum body piercer cadastrado ainda.
            </p>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
          <span className="text-neutral-300">Total do período (piercing)</span>
          <span className="text-lg font-semibold text-white">
            {formatMoney(grandTotal)}
          </span>
        </div>
      </div>

      {profile.role === "admin" && (
        <>
          <Link
            href="/relatorios/graficos"
            className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 transition hover:border-neutral-600"
          >
            <h2 className="font-semibold text-white">Gráficos Financeiros →</h2>
            <p className="mt-1 text-sm text-neutral-400">
              Receita, custo e evolução mês a mês, num relance.
            </p>
          </Link>
          <Link
            href="/relatorios/fechamento"
            className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 transition hover:border-neutral-600"
          >
            <h2 className="font-semibold text-white">Fechamento Financeiro →</h2>
            <p className="mt-1 text-sm text-neutral-400">
              Receita cruzada por serviço, colaborador, loja e segmento
              (tatuagem/piercing/coworking/curso), com fechamento mensal.
            </p>
          </Link>
          <Link
            href="/relatorios/servicos"
            className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 transition hover:border-neutral-600"
          >
            <h2 className="font-semibold text-white">Relatório de Serviços →</h2>
            <p className="mt-1 text-sm text-neutral-400">
              Tatuagem e piercing juntos, com filtros combináveis, comissão e
              exportação em CSV/PDF.
            </p>
          </Link>
          <Link
            href="/relatorios/barra-shopping"
            className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 transition hover:border-neutral-600"
          >
            <h2 className="font-semibold text-white">
              Relatório ao Financeiro — Barra Shopping →
            </h2>
            <p className="mt-1 text-sm text-neutral-400">
              Fechamento mensal da unidade em três blocos (piercing, tatuagem,
              produtos/jóias).
            </p>
          </Link>
          <RentalIncomeReport from={from} to={to} start={start} end={end} />
        </>
      )}
    </div>
  );
}
