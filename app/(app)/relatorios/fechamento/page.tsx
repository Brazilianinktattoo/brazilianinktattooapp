import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { monthStartParam, todayParam } from "@/lib/date";
import type { Profile, Unit } from "@/lib/types/database";
import {
  fetchFinanceLines,
  summarizeFinanceLines,
  groupByMonth,
  SEGMENT_LABEL,
  type FinanceSegment,
} from "@/lib/reports/fechamento";

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const SEGMENTS: FinanceSegment[] = ["tatuagem", "piercing", "coworking", "curso"];

export default async function FechamentoFinanceiroPage(
  props: PageProps<"/relatorios/fechamento">
) {
  const searchParams = await props.searchParams;
  await requireAdmin();

  const str = (k: string) =>
    typeof searchParams[k] === "string" ? (searchParams[k] as string) : "";

  const filters = {
    from: str("from") || monthStartParam(),
    to: str("to") || todayParam(),
    segment: (str("segment") || undefined) as FinanceSegment | undefined,
    collaboratorId: str("collaborator_id") || undefined,
    unitId: str("unit_id") || undefined,
    serviceQuery: str("service") || undefined,
  };
  const view = str("view") === "mensal" ? "mensal" : "lista";

  const supabase = await createClient();
  const [{ data: collaborators }, { data: units }, lines] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("role", ["tatuador", "piercer", "admin", "chefe_piercing"])
      .order("full_name")
      .returns<Pick<Profile, "id" | "full_name" | "role">[]>(),
    supabase.from("units").select("*").order("name").returns<Unit[]>(),
    fetchFinanceLines(supabase, filters),
  ]);

  const summary = summarizeFinanceLines(lines);
  const months = view === "mensal" ? groupByMonth(lines) : [];

  const baseQuery = {
    from: filters.from,
    to: filters.to,
    segment: filters.segment ?? "",
    collaborator_id: filters.collaboratorId ?? "",
    unit_id: filters.unitId ?? "",
    service: filters.serviceQuery ?? "",
  };
  const viewHref = (v: string) => {
    const usp = new URLSearchParams({ ...baseQuery, view: v });
    return `?${usp.toString()}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/relatorios" className="text-sm text-neutral-500 hover:text-white">
          ← Relatórios
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-white">
          Fechamento Financeiro
        </h1>
        <p className="text-neutral-400">
          Receita cruzada por serviço, colaborador, loja e segmento
          (tatuagem/piercing/coworking/curso) — período customizado ou
          fechamento mensal.
        </p>
      </div>

      <form className="grid gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 sm:grid-cols-3">
        <input type="hidden" name="view" value={view} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="from" className="text-sm text-neutral-300">
            De
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={filters.from}
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
            defaultValue={filters.to}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold [color-scheme:dark]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="segment" className="text-sm text-neutral-300">
            Segmento
          </label>
          <select
            id="segment"
            name="segment"
            defaultValue={filters.segment ?? ""}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
          >
            <option value="">Todos</option>
            {SEGMENTS.map((s) => (
              <option key={s} value={s}>
                {SEGMENT_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="unit_id" className="text-sm text-neutral-300">
            Loja
          </label>
          <select
            id="unit_id"
            name="unit_id"
            defaultValue={filters.unitId ?? ""}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
          >
            <option value="">Todas</option>
            {(units ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="collaborator_id" className="text-sm text-neutral-300">
            Colaborador
          </label>
          <select
            id="collaborator_id"
            name="collaborator_id"
            defaultValue={filters.collaboratorId ?? ""}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
          >
            <option value="">Todos</option>
            {(collaborators ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name || "Sem nome"}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="service" className="text-sm text-neutral-300">
            Serviço
          </label>
          <input
            id="service"
            name="service"
            defaultValue={filters.serviceQuery ?? ""}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 font-medium text-neutral-950 transition hover:to-copper"
          >
            Filtrar
          </button>
        </div>
      </form>

      <div className="flex gap-2">
        <Link
          href={viewHref("lista")}
          className={`rounded-full border px-3 py-1 text-sm transition ${
            view === "lista"
              ? "border-gold text-gold"
              : "border-neutral-700 text-neutral-400 hover:border-gold-soft hover:text-gold"
          }`}
        >
          Lista
        </Link>
        <Link
          href={viewHref("mensal")}
          className={`rounded-full border px-3 py-1 text-sm transition ${
            view === "mensal"
              ? "border-gold text-gold"
              : "border-neutral-700 text-neutral-400 hover:border-gold-soft hover:text-gold"
          }`}
        >
          Fechamento mensal
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-xl border border-gold-soft/30 bg-neutral-900/40 p-4">
          <h2 className="font-semibold text-white">Total</h2>
          <p className="mt-1 text-sm text-neutral-400">{summary.count} lançamento(s)</p>
          <p className="text-lg font-semibold text-gold">{money(summary.total)}</p>
        </div>
        {SEGMENTS.map((s) => (
          <div key={s} className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
            <h2 className="font-semibold text-white">{SEGMENT_LABEL[s]}</h2>
            <p className="mt-1 text-sm text-neutral-400">
              {summary.bySegment[s].count} lançamento(s)
            </p>
            <p className="text-lg font-semibold text-white">
              {money(summary.bySegment[s].total)}
            </p>
          </div>
        ))}
      </div>

      {view === "mensal" ? (
        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-gold-soft/20 text-neutral-500">
                <th className="py-3 pl-4 pr-4 font-medium">Mês</th>
                {SEGMENTS.map((s) => (
                  <th key={s} className="py-3 pr-4 font-medium">
                    {SEGMENT_LABEL[s]}
                  </th>
                ))}
                <th className="py-3 pr-4 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.month} className="border-b border-neutral-800">
                  <td className="py-3 pl-4 pr-4 text-neutral-100 capitalize">
                    {m.label}
                  </td>
                  {SEGMENTS.map((s) => (
                    <td key={s} className="py-3 pr-4 text-neutral-300">
                      {money(m.bySegment[s])}
                    </td>
                  ))}
                  <td className="py-3 pr-4 font-medium text-white">
                    {money(m.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {months.length === 0 && (
            <p className="p-6 text-center text-neutral-500">
              Nenhum lançamento encontrado com esses filtros.
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-gold-soft/20 text-neutral-500">
                <th className="py-3 pl-4 pr-4 font-medium">Data</th>
                <th className="py-3 pr-4 font-medium">Segmento</th>
                <th className="py-3 pr-4 font-medium">Loja</th>
                <th className="py-3 pr-4 font-medium">Colaborador</th>
                <th className="py-3 pr-4 font-medium">Cliente</th>
                <th className="py-3 pr-4 font-medium">Serviço</th>
                <th className="py-3 pr-4 font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id} className="border-b border-neutral-800">
                  <td className="py-3 pl-4 pr-4 whitespace-nowrap text-neutral-300">
                    {l.date ? new Date(l.date).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="py-3 pr-4 text-neutral-300">
                    {SEGMENT_LABEL[l.segment]}
                  </td>
                  <td className="py-3 pr-4 text-neutral-300">{l.unitName}</td>
                  <td className="py-3 pr-4 text-neutral-300">
                    {l.collaboratorName || "—"}
                  </td>
                  <td className="py-3 pr-4 text-neutral-300">{l.clientName}</td>
                  <td className="py-3 pr-4 text-neutral-300">{l.serviceName}</td>
                  <td className="py-3 pr-4 text-neutral-300">{money(l.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {lines.length === 0 && (
            <p className="p-6 text-center text-neutral-500">
              Nenhum lançamento encontrado com esses filtros.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
