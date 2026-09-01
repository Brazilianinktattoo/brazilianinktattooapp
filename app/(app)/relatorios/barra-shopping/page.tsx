import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatStudioDate, monthStartParam, todayParam } from "@/lib/date";
import { fetchBarraShoppingReport, subtotal } from "@/lib/reports/barra-shopping";

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

export default async function RelatorioBarraShoppingPage(
  props: PageProps<"/relatorios/barra-shopping">
) {
  const searchParams = await props.searchParams;
  await requireAdmin();

  const str = (k: string) =>
    typeof searchParams[k] === "string" ? (searchParams[k] as string) : "";

  const filters = {
    from: str("from") || monthStartParam(),
    to: str("to") || todayParam(),
  };

  const supabase = await createClient();
  const report = await fetchBarraShoppingReport(supabase, filters);

  const piercingTotal = subtotal(report.piercingServices);
  const tattooTotal = subtotal(report.tattooServices);
  const productsTotal = subtotal(report.productSales);
  const grandTotal = piercingTotal + tattooTotal + productsTotal;

  const exportQuery = buildQuery({ from: filters.from, to: filters.to });

  const blocks = [
    { title: "Serviços de piercing", lines: report.piercingServices, total: piercingTotal },
    { title: "Serviços de tatuagem", lines: report.tattooServices, total: tattooTotal },
    { title: "Vendas de produtos/jóias", lines: report.productSales, total: productsTotal },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/relatorios" className="text-sm text-neutral-500 hover:text-white">
          ← Relatórios
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-white">
          Relatório ao Financeiro — Barra Shopping
        </h1>
        <p className="text-neutral-400">
          Só pra conferência com o sócio da unidade — exporte e compartilhe o
          arquivo, sem precisar dar acesso ao app.
        </p>
      </div>

      <form className="grid gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 sm:grid-cols-3">
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
        <div className="flex items-end">
          <button
            type="submit"
            className="rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 font-medium text-neutral-950 transition hover:to-copper"
          >
            Filtrar
          </button>
        </div>
      </form>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
          <h2 className="font-semibold text-white">Piercing</h2>
          <p className="text-lg font-semibold text-white">{money(piercingTotal)}</p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
          <h2 className="font-semibold text-white">Tatuagem</h2>
          <p className="text-lg font-semibold text-white">{money(tattooTotal)}</p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
          <h2 className="font-semibold text-white">Produtos/jóias</h2>
          <p className="text-lg font-semibold text-white">{money(productsTotal)}</p>
        </div>
        <div className="rounded-xl border border-red-800 bg-red-500/10 p-4">
          <h2 className="font-semibold text-white">Total geral</h2>
          <p className="text-lg font-semibold text-white">{money(grandTotal)}</p>
        </div>
      </div>

      <div className="flex gap-3">
        <a
          href={`/relatorios/barra-shopping/export/csv?${exportQuery}`}
          className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:border-gold-soft hover:text-gold"
        >
          Exportar CSV
        </a>
        <a
          href={`/relatorios/barra-shopping/export/pdf?${exportQuery}`}
          className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:border-gold-soft hover:text-gold"
        >
          Exportar PDF
        </a>
      </div>

      {blocks.map((block) => (
        <div key={block.title} className="flex flex-col gap-2">
          <h2 className="font-semibold text-white">{block.title}</h2>
          <div className="overflow-x-auto rounded-xl border border-neutral-800">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-gold-soft/20 text-neutral-500">
                  <th className="py-3 pl-4 pr-4 font-medium">Data</th>
                  <th className="py-3 pr-4 font-medium">Cliente</th>
                  <th className="py-3 pr-4 font-medium">Descrição</th>
                  <th className="py-3 pr-4 font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {block.lines.map((l, i) => (
                  <tr key={i} className="border-b border-neutral-800">
                    <td className="py-3 pl-4 pr-4 text-neutral-300 whitespace-nowrap">
                      {l.date ? formatStudioDate(l.date) : "—"}
                    </td>
                    <td className="py-3 pr-4 text-neutral-300">{l.clientName}</td>
                    <td className="py-3 pr-4 text-neutral-300">{l.description}</td>
                    <td className="py-3 pr-4 text-neutral-300">{money(l.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {block.lines.length === 0 && (
              <p className="p-6 text-center text-neutral-500">
                Nenhum lançamento no período.
              </p>
            )}
          </div>
          <div className="flex justify-end text-sm text-neutral-400">
            Subtotal: {money(block.total)}
          </div>
        </div>
      ))}
    </div>
  );
}
