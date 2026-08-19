import { createClient } from "@/lib/supabase/server";
import type { FixedBill } from "@/lib/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type MonthlyCost = {
  month: string;
  label: string;
  total: number;
};

function monthKey(iso: string) {
  return iso.slice(0, 7);
}

function monthLabel(key: string) {
  return new Date(`${key}-01T12:00:00Z`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

// Custo mensal a partir das Contas Fixas — agrupado pelo mês do vencimento
// (ou pagamento, se não tiver vencimento). Como fixed_bills é um livro
// "vivo" (cada linha é editada mês a mês, não duplicada), só existe sinal
// histórico real pros meses em que o admin já preencheu data.
export async function fetchMonthlyCosts(
  supabase: SupabaseServerClient
): Promise<MonthlyCost[]> {
  const { data } = await supabase
    .from("fixed_bills")
    .select("*")
    .returns<FixedBill[]>();

  const byMonth = new Map<string, number>();
  for (const b of data ?? []) {
    const dateRef = b.due_date ?? b.paid_date;
    if (!dateRef) continue;
    const key = monthKey(dateRef);
    byMonth.set(key, (byMonth.get(key) ?? 0) + b.amount);
  }

  return [...byMonth.entries()]
    .map(([month, total]) => ({ month, label: monthLabel(month), total }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
