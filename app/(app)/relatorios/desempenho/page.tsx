import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  dayBounds,
  formatDateLabel,
  formatMonthLabel,
  formatWeekLabel,
  monthBounds,
  monthOf,
  shiftDate,
  shiftMonth,
  shiftWeek,
  shiftYear,
  todayParam,
  weekBounds,
  yearBounds,
  yearOf,
} from "@/lib/date";
import { fetchDesempenho, type PeriodType } from "@/lib/reports/desempenho";
import type { Profile, Unit } from "@/lib/types/database";

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function buildQuery(params: Record<string, string | undefined>) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) usp.set(k, v);
  }
  return usp.toString();
}

const PERIOD_LABEL: Record<PeriodType, string> = {
  dia: "Dia",
  semana: "Semana",
  mes: "Mês",
  ano: "Ano",
};

export default async function DesempenhoPage(
  props: PageProps<"/relatorios/desempenho">
) {
  const searchParams = await props.searchParams;
  await requireAdmin();

  const str = (k: string) =>
    typeof searchParams[k] === "string" ? (searchParams[k] as string) : "";

  const requestedPeriod = str("period");
  const period: PeriodType = (["dia", "semana", "mes", "ano"] as const).includes(
    requestedPeriod as PeriodType
  )
    ? (requestedPeriod as PeriodType)
    : "mes";

  const dateParam = str("date") || todayParam();
  const unitId = str("unit_id") || undefined;
  const collaboratorId = str("collaborator_id") || undefined;

  const { start, end } =
    period === "dia"
      ? dayBounds(dateParam)
      : period === "semana"
        ? weekBounds(dateParam)
        : period === "mes"
          ? monthBounds(monthOf(dateParam))
          : yearBounds(yearOf(dateParam));

  const periodLabel =
    period === "dia"
      ? formatDateLabel(dateParam)
      : period === "semana"
        ? formatWeekLabel(dateParam)
        : period === "mes"
          ? formatMonthLabel(monthOf(dateParam))
          : yearOf(dateParam);

  const shiftedDate =
    period === "dia"
      ? { prev: shiftDate(dateParam, -1), next: shiftDate(dateParam, 1) }
      : period === "semana"
        ? { prev: shiftWeek(dateParam, -1), next: shiftWeek(dateParam, 1) }
        : period === "mes"
          ? {
              prev: `${shiftMonth(monthOf(dateParam), -1)}-01`,
              next: `${shiftMonth(monthOf(dateParam), 1)}-01`,
            }
          : {
              prev: `${shiftYear(yearOf(dateParam), -1)}-01-01`,
              next: `${shiftYear(yearOf(dateParam), 1)}-01-01`,
            };

  const baseParams = {
    period,
    unit_id: unitId,
    collaborator_id: collaboratorId,
  };

  const supabase = await createClient();
  const [{ data: units }, { data: collaborators }, data] = await Promise.all([
    supabase.from("units").select("*").order("name").returns<Unit[]>(),
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("role", ["tatuador", "piercer", "admin", "chefe_piercing"])
      .order("full_name")
      .returns<Pick<Profile, "id" | "full_name" | "role">[]>(),
    fetchDesempenho(supabase, { from: start, to: end, unitId, collaboratorId }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/relatorios" className="text-sm text-neutral-500 hover:text-white">
          ← Relatórios
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-white">Desempenho</h1>
        <p className="text-neutral-400">
          Faturamento e movimento por loja, colaborador, serviço e jóia —
          diário, semanal, mensal ou anual.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(["dia", "semana", "mes", "ano"] as const).map((p) => (
            <Link
              key={p}
              href={`/relatorios/desempenho?${buildQuery({ ...baseParams, period: p, date: dateParam })}`}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                period === p
                  ? "border-gold text-gold"
                  : "border-neutral-700 text-neutral-400 hover:border-gold-soft hover:text-gold"
              }`}
            >
              {PERIOD_LABEL[p]}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/relatorios/desempenho?${buildQuery({ ...baseParams, date: shiftedDate.prev })}`}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-gold-soft hover:text-gold"
          >
            ← Anterior
          </Link>
          <Link
            href={`/relatorios/desempenho?${buildQuery({ ...baseParams, date: todayParam() })}`}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-gold-soft hover:text-gold"
          >
            Hoje
          </Link>
          <Link
            href={`/relatorios/desempenho?${buildQuery({ ...baseParams, date: shiftedDate.next })}`}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-gold-soft hover:text-gold"
          >
            Próximo →
          </Link>
        </div>
      </div>

      <p className="capitalize text-neutral-300">{periodLabel}</p>

      <form className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
        <input type="hidden" name="period" value={period} />
        <input type="hidden" name="date" value={dateParam} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="unit_id" className="text-sm text-neutral-300">
            Loja
          </label>
          <select
            id="unit_id"
            name="unit_id"
            defaultValue={unitId ?? ""}
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
            defaultValue={collaboratorId ?? ""}
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
        <button
          type="submit"
          className="rounded-lg border border-neutral-700 px-4 py-2 text-neutral-300 hover:border-gold-soft hover:text-gold"
        >
          Filtrar
        </button>
        {(unitId || collaboratorId) && (
          <Link
            href={`/relatorios/desempenho?${buildQuery({ period, date: dateParam })}`}
            className="text-sm text-neutral-500 hover:text-white"
          >
            Limpar filtros
          </Link>
        )}
      </form>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Faturamento", value: money(data.totais.faturamento) },
          { label: "Comandas", value: String(data.totais.comandas) },
          { label: "Fechadas", value: String(data.totais.comandasFechadas) },
          { label: "Serviços", value: String(data.totais.servicos) },
          { label: "Jóias vendidas", value: String(data.totais.joias) },
          { label: "Fichas preenchidas", value: String(data.fichasPreenchidas) },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4"
          >
            <div className="text-xs text-neutral-500">{stat.label}</div>
            <div className="mt-1 text-lg font-semibold text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
        <h2 className="mb-2 font-semibold text-white">Faturamento por tipo</h2>
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <span className="text-neutral-500">Serviços: </span>
            <span className="text-neutral-100">{money(data.totais.faturamentoServicos)}</span>
          </div>
          <div>
            <span className="text-neutral-500">Jóias: </span>
            <span className="text-neutral-100">{money(data.totais.faturamentoJoias)}</span>
          </div>
          <div>
            <span className="text-neutral-500">Produtos: </span>
            <span className="text-neutral-100">{money(data.totais.faturamentoProdutos)}</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-gold-soft/20 text-neutral-500">
              <th className="py-3 pl-4 pr-4 font-medium">Loja</th>
              <th className="py-3 pr-4 font-medium">Faturamento</th>
              <th className="py-3 pr-4 font-medium">Comandas</th>
              <th className="py-3 pr-4 font-medium">Fechadas</th>
            </tr>
          </thead>
          <tbody>
            {data.porLoja.map((l) => (
              <tr key={l.unitId} className="border-b border-neutral-800">
                <td className="py-3 pl-4 pr-4 text-neutral-100">{l.unitName}</td>
                <td className="py-3 pr-4 text-neutral-100">{money(l.faturamento)}</td>
                <td className="py-3 pr-4 text-neutral-300">{l.comandas}</td>
                <td className="py-3 pr-4 text-neutral-300">{l.comandasFechadas}</td>
              </tr>
            ))}
            {data.porLoja.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-neutral-500">
                  Nenhum movimento no período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-white">
          Ranking de colaboradores (por faturamento)
        </h2>
        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-gold-soft/20 text-neutral-500">
                <th className="py-3 pl-4 pr-4 font-medium">Colaborador</th>
                <th className="py-3 pr-4 font-medium">Acesso</th>
                <th className="py-3 pr-4 font-medium">Faturamento</th>
                <th className="py-3 pr-4 font-medium">Comandas geradas</th>
                <th className="py-3 pr-4 font-medium">Serviços realizados</th>
              </tr>
            </thead>
            <tbody>
              {data.porColaborador.map((c) => (
                <tr key={c.collaboratorId} className="border-b border-neutral-800">
                  <td className="py-3 pl-4 pr-4 text-neutral-100">{c.collaboratorName}</td>
                  <td className="py-3 pr-4 text-neutral-400">{c.role}</td>
                  <td className="py-3 pr-4 text-neutral-100">{money(c.faturamento)}</td>
                  <td className="py-3 pr-4 text-neutral-300">{c.comandas}</td>
                  <td className="py-3 pr-4 text-neutral-300">{c.servicos}</td>
                </tr>
              ))}
              {data.porColaborador.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-neutral-500">
                    Nenhum movimento no período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-semibold text-white">Serviços mais realizados</h2>
          <div className="overflow-x-auto rounded-xl border border-neutral-800">
            <table className="w-full min-w-[360px] text-left text-sm">
              <thead>
                <tr className="border-b border-gold-soft/20 text-neutral-500">
                  <th className="py-3 pl-4 pr-4 font-medium">Serviço</th>
                  <th className="py-3 pr-4 font-medium">Qtd.</th>
                  <th className="py-3 pr-4 font-medium">Faturamento</th>
                </tr>
              </thead>
              <tbody>
                {data.porServico.slice(0, 15).map((s) => (
                  <tr key={s.description} className="border-b border-neutral-800">
                    <td className="py-3 pl-4 pr-4 text-neutral-100">{s.description}</td>
                    <td className="py-3 pr-4 text-neutral-300">{s.quantidade}</td>
                    <td className="py-3 pr-4 text-neutral-300">{money(s.faturamento)}</td>
                  </tr>
                ))}
                {data.porServico.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-neutral-500">
                      Nenhum serviço no período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="mb-3 font-semibold text-white">Jóias mais vendidas</h2>
          <div className="overflow-x-auto rounded-xl border border-neutral-800">
            <table className="w-full min-w-[360px] text-left text-sm">
              <thead>
                <tr className="border-b border-gold-soft/20 text-neutral-500">
                  <th className="py-3 pl-4 pr-4 font-medium">Jóia</th>
                  <th className="py-3 pr-4 font-medium">Qtd.</th>
                  <th className="py-3 pr-4 font-medium">Faturamento</th>
                </tr>
              </thead>
              <tbody>
                {data.porJoia.slice(0, 15).map((j) => (
                  <tr key={j.jewelryName} className="border-b border-neutral-800">
                    <td className="py-3 pl-4 pr-4 text-neutral-100">{j.jewelryName}</td>
                    <td className="py-3 pr-4 text-neutral-300">{j.quantidade}</td>
                    <td className="py-3 pr-4 text-neutral-300">{money(j.faturamento)}</td>
                  </tr>
                ))}
                {data.porJoia.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-neutral-500">
                      Nenhuma jóia no período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-white">
          Movimento por dia da semana
        </h2>
        <div className="flex flex-col gap-2">
          {data.porDiaSemana.map((d) => {
            const max = Math.max(1, ...data.porDiaSemana.map((x) => x.comandas));
            return (
              <div key={d.weekday} className="flex items-center gap-3 text-sm">
                <span className="w-20 shrink-0 text-neutral-300">{d.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-800">
                  <div
                    className="h-full rounded-full bg-gold-soft"
                    style={{ width: `${(d.comandas / max) * 100}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-neutral-400">
                  {d.comandas}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
