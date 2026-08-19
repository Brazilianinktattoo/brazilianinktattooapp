import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { monthOf, shiftMonth, todayParam } from "@/lib/date";
import { fetchFinanceLines, groupByMonth, SEGMENT_LABEL } from "@/lib/reports/fechamento";
import { fetchMonthlyCosts } from "@/lib/reports/monthly-costs";
import { BarChart } from "./bar-chart";

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const MONTHS_WINDOW = 6;

export default async function GraficosFinanceirosPage() {
  await requireAdmin();
  const supabase = await createClient();

  const from = `${shiftMonth(monthOf(todayParam()), -(MONTHS_WINDOW - 1))}-01`;
  const to = todayParam();

  const [lines, costs] = await Promise.all([
    fetchFinanceLines(supabase, { from, to }),
    fetchMonthlyCosts(supabase),
  ]);

  const revenueByMonth = groupByMonth(lines);
  const costsInWindow = costs.filter((c) => c.month >= monthOf(from) && c.month <= monthOf(to));

  // Uma linha do tempo só com os meses que têm receita ou custo, na ordem —
  // evita furo se um mês não teve nenhum lançamento.
  const monthKeys = [
    ...new Set([...revenueByMonth.map((m) => m.month), ...costsInWindow.map((m) => m.month)]),
  ].sort();

  const revenueByMonthMap = new Map(revenueByMonth.map((m) => [m.month, m]));
  const costsByMonthMap = new Map(costsInWindow.map((m) => [m.month, m.total]));

  const monthLabel = (key: string) =>
    new Date(`${key}-01T12:00:00Z`).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });

  const revenueData = monthKeys.map((key) => ({
    label: monthLabel(key),
    value: revenueByMonthMap.get(key)?.total ?? 0,
  }));
  const costData = monthKeys.map((key) => ({
    label: monthLabel(key),
    value: costsByMonthMap.get(key) ?? 0,
  }));
  const evolutionData = monthKeys.map((key) => ({
    label: monthLabel(key),
    value: revenueByMonthMap.get(key)?.total ?? 0,
    value2: costsByMonthMap.get(key) ?? 0,
  }));

  const segmentTotals = ["tatuagem", "piercing", "coworking", "curso"] as const;
  const segmentData = segmentTotals.map((s) => ({
    label: SEGMENT_LABEL[s],
    value: revenueByMonth.reduce((sum, m) => sum + m.bySegment[s], 0),
  }));

  const totalRevenue = revenueByMonth.reduce((s, m) => s + m.total, 0);
  const totalCosts = costsInWindow.reduce((s, m) => s + m.total, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/relatorios" className="text-sm text-neutral-500 hover:text-white">
          ← Relatórios
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-white">Gráficos Financeiros</h1>
        <p className="text-neutral-400">
          Últimos {MONTHS_WINDOW} meses — receita e custo vêm de Fechamento
          Financeiro e Contas Fixas.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gold-soft/30 bg-neutral-900/40 p-4">
          <h2 className="font-semibold text-white">Receita no período</h2>
          <p className="mt-1 text-2xl font-semibold text-gold">{money(totalRevenue)}</p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
          <h2 className="font-semibold text-white">Custo no período</h2>
          <p className="mt-1 text-2xl font-semibold text-neutral-100">{money(totalCosts)}</p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
          <h2 className="font-semibold text-white">Resultado</h2>
          <p
            className={`mt-1 text-2xl font-semibold ${
              totalRevenue - totalCosts >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {money(totalRevenue - totalCosts)}
          </p>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-neutral-300">
          Evolução financeira — receita x custo
        </h2>
        <BarChart data={evolutionData} series1Label="Receita" series2Label="Custo" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h2 className="mb-2 text-sm font-medium text-neutral-300">Receita mês a mês</h2>
          <BarChart data={revenueData} />
        </div>
        <div>
          <h2 className="mb-2 text-sm font-medium text-neutral-300">
            Custo (contas fixas) mês a mês
          </h2>
          <BarChart data={costData} />
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-neutral-300">
          Receita por segmento (no período)
        </h2>
        <BarChart data={segmentData} />
      </div>
    </div>
  );
}
