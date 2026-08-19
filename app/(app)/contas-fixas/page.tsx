import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FixedBill } from "@/lib/types/database";
import { NewFixedBillForm } from "./new-fixed-bill-form";
import { FixedBillRow } from "./fixed-bill-row";

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function ContasFixasPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: bills } = await supabase
    .from("fixed_bills")
    .select("*")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("name")
    .returns<FixedBill[]>();

  const list = bills ?? [];
  const pending = list.filter((b) => !b.paid_date);
  const totalPending = pending.reduce((sum, b) => sum + b.amount, 0);
  const totalMonth = list.reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Contas Fixas</h1>
        <p className="text-neutral-400">
          Despesas recorrentes do estúdio — atualize valor e datas todo mês.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
          <div className="text-sm text-neutral-400">Total em aberto</div>
          <div className="mt-1 text-2xl font-semibold text-gold">
            {formatMoney(totalPending)}
          </div>
          <div className="text-xs text-neutral-500">
            {pending.length} conta(s) pendente(s)
          </div>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
          <div className="text-sm text-neutral-400">Total cadastrado no mês</div>
          <div className="mt-1 text-2xl font-semibold text-neutral-100">
            {formatMoney(totalMonth)}
          </div>
          <div className="text-xs text-neutral-500">{list.length} conta(s)</div>
        </div>
      </div>

      <NewFixedBillForm />

      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-gold-soft/20 text-neutral-500">
              <th className="py-3 pl-4 pr-4 font-medium">Tipo de conta</th>
              <th className="py-3 pr-4 font-medium">Valor</th>
              <th className="py-3 pr-4 font-medium">Vencimento</th>
              <th className="py-3 pr-4 font-medium">Pagamento</th>
              <th className="py-3 pr-4 font-medium" />
            </tr>
          </thead>
          <tbody>
            {list.map((bill) => (
              <FixedBillRow key={bill.id} bill={bill} />
            ))}
          </tbody>
        </table>
        {list.length === 0 && (
          <p className="p-6 text-center text-neutral-500">
            Nenhuma conta cadastrada ainda.
          </p>
        )}
      </div>
    </div>
  );
}
