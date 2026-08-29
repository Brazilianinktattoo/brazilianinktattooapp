import Link from "next/link";
import { requireCollaborator } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMonthLabel, monthOf, shiftDate, shiftMonth, todayParam } from "@/lib/date";
import { fetchServiceReportLines, summarizeServiceReport } from "@/lib/reports/servicos";

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function MeuDesempenhoPage(
  props: PageProps<"/meu-desempenho">
) {
  const searchParams = await props.searchParams;
  const { user, profile } = await requireCollaborator();

  const currentMonth = monthOf(todayParam());
  const monthParam = typeof searchParams.month === "string" ? searchParams.month : "";
  const month = /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : currentMonth;

  const from = `${month}-01`;
  const to = shiftDate(`${shiftMonth(month, 1)}-01`, -1);

  const supabase = await createClient();
  const lines = await fetchServiceReportLines(supabase, {
    from,
    to,
    collaboratorId: user.id,
  });
  const summary = summarizeServiceReport(lines);
  const sortedLines = [...lines].sort((a, b) => b.date.localeCompare(a.date));

  const showJewelry = profile.role !== "tatuador";
  const jewelryLines = lines.filter((l) => l.kind === "Venda de jóia");
  const serviceLines = lines.filter((l) => l.kind === "Serviço");
  const jewelrySummary = summarizeServiceReport(jewelryLines).total;
  const serviceSummary = summarizeServiceReport(serviceLines).total;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Meu Desempenho</h1>
        <p className="text-neutral-400">
          Comandas fechadas e comissão calculada pela regra do estúdio (Barra
          Shopping 50% · Downtown 70% cliente próprio / 50% cliente do estúdio).
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
        <Link
          href={`/meu-desempenho?month=${shiftMonth(month, -1)}`}
          className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-gold-soft hover:text-gold"
        >
          ← Anterior
        </Link>
        <div className="text-center">
          <p className="font-medium capitalize text-white">{formatMonthLabel(month)}</p>
          {month !== currentMonth && (
            <Link href="/meu-desempenho" className="text-xs text-gold hover:underline">
              Voltar pro mês atual
            </Link>
          )}
        </div>
        <Link
          href={`/meu-desempenho?month=${shiftMonth(month, 1)}`}
          className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-gold-soft hover:text-gold"
        >
          Próximo →
        </Link>
      </div>

      <div className={`grid gap-4 ${showJewelry ? "sm:grid-cols-3" : "sm:grid-cols-1"}`}>
        <div className="rounded-xl border border-gold-soft/30 bg-neutral-900/40 p-4">
          <h2 className="font-semibold text-white">Total</h2>
          <p className="mt-1 text-sm text-neutral-400">{summary.total.atendimentos} atendimento(s)</p>
          <p className="text-2xl font-semibold text-white">{money(summary.total.comissao)}</p>
          <p className="text-sm text-neutral-400">de comissão · faturado {money(summary.total.faturado)}</p>
        </div>
        {showJewelry && (
          <>
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
              <h2 className="font-semibold text-white">Serviços</h2>
              <p className="mt-1 text-sm text-neutral-400">{serviceSummary.atendimentos} atendimento(s)</p>
              <p className="text-lg font-semibold text-white">{money(serviceSummary.comissao)}</p>
              <p className="text-sm text-neutral-400">faturado {money(serviceSummary.faturado)}</p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
              <h2 className="font-semibold text-white">Venda de jóia</h2>
              <p className="mt-1 text-sm text-neutral-400">{jewelryLines.length} venda(s)</p>
              <p className="text-lg font-semibold text-white">{money(jewelrySummary.comissao)}</p>
              <p className="text-sm text-neutral-400">faturado {money(jewelrySummary.faturado)}</p>
            </div>
          </>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-gold-soft/20 text-neutral-500">
              <th className="py-3 pl-4 pr-4 font-medium">Data</th>
              <th className="py-3 pr-4 font-medium">Cliente</th>
              <th className="py-3 pr-4 font-medium">Serviço</th>
              <th className="py-3 pr-4 font-medium">Tipo</th>
              <th className="py-3 pr-4 font-medium">Valor</th>
              <th className="py-3 pr-4 font-medium">Comissão</th>
            </tr>
          </thead>
          <tbody>
            {sortedLines.map((l) => (
              <tr key={l.serviceId} className="border-b border-neutral-800">
                <td className="py-3 pl-4 pr-4 text-neutral-300 whitespace-nowrap">
                  {l.date ? new Date(l.date).toLocaleDateString("pt-BR") : "—"}
                </td>
                <td className="py-3 pr-4 text-neutral-300">{l.clientName}</td>
                <td className="py-3 pr-4 text-neutral-300">{l.description}</td>
                <td className="py-3 pr-4 text-neutral-300">{l.kind}</td>
                <td className="py-3 pr-4 text-neutral-300">{money(l.price)}</td>
                <td className="py-3 pr-4 text-neutral-300">
                  {money(l.commission)}
                  <span className="ml-1 text-xs text-neutral-500">
                    ({Math.round(l.commissionRate * 100)}%)
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sortedLines.length === 0 && (
          <p className="p-6 text-center text-neutral-500">
            Nenhum atendimento fechado neste mês ainda.
          </p>
        )}
      </div>
    </div>
  );
}
