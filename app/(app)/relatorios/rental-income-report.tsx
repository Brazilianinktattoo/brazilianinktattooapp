import { createClient } from "@/lib/supabase/server";
import type { CoworkingPassWithRelations } from "@/lib/types/database";

function formatMoney(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Receita de locação (coworking) — separada de propósito do faturamento de
// comandas: valor fixo do período + percentual sobre o que o visitante
// faturou (lançado manualmente pelo admin).
export async function RentalIncomeReport({
  from,
  to,
  start,
  end,
}: {
  from: string;
  to: string;
  start: Date;
  end: Date;
}) {
  const supabase = await createClient();
  const { data: passes } = await supabase
    .from("coworking_passes")
    .select("*, unit:units(id, name), maca:macas(id, label)")
    .lte("starts_at", end.toISOString())
    .gte("ends_at", start.toISOString())
    .order("starts_at", { ascending: false })
    .returns<CoworkingPassWithRelations[]>();

  const rows = (passes ?? []).map((p) => ({
    ...p,
    rentalTotal: p.fixed_fee + (p.reported_revenue * p.percentage) / 100,
  }));
  const total = rows.reduce((s, r) => s + r.rentalTotal, 0);

  return (
    <div>
      <h2 className="mb-3 font-semibold text-white">
        Receita de locação (coworking)
      </h2>

      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Nenhum acesso de coworking no período {from} – {to}.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-neutral-800">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-gold-soft/20 text-neutral-500">
                  <th className="py-3 pl-4 pr-4 font-medium">Visitante</th>
                  <th className="py-3 pr-4 font-medium">Maca</th>
                  <th className="py-3 pr-4 font-medium">Valor fixo</th>
                  <th className="py-3 pr-4 font-medium">% s/ faturamento</th>
                  <th className="py-3 pr-4 font-medium">Faturamento reportado</th>
                  <th className="py-3 pr-4 font-medium">Receita de locação</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-neutral-800">
                    <td className="py-3 pl-4 pr-4 text-neutral-100">
                      {r.guest_name}
                    </td>
                    <td className="py-3 pr-4 text-neutral-300">
                      {r.unit?.name ?? "—"} · {r.maca?.label ?? "—"}
                    </td>
                    <td className="py-3 pr-4 text-neutral-300">
                      {formatMoney(r.fixed_fee)}
                    </td>
                    <td className="py-3 pr-4 text-neutral-300">
                      {r.percentage}%
                    </td>
                    <td className="py-3 pr-4 text-neutral-300">
                      {formatMoney(r.reported_revenue)}
                    </td>
                    <td className="py-3 pr-4 font-medium text-white">
                      {formatMoney(r.rentalTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
            <span className="text-neutral-300">
              Total de receita de locação no período
            </span>
            <span className="text-lg font-semibold text-white">
              {formatMoney(total)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
