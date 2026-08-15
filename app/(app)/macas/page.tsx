import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Maca } from "@/lib/types/database";
import { NewMacaForm } from "./new-maca-form";
import { MacaRow } from "./maca-row";

export default async function MacasPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: macas } = await supabase
    .from("macas")
    .select("*")
    .order("label")
    .returns<Maca[]>();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Macas</h1>
        <p className="text-neutral-400">
          Gerencie as macas disponíveis para agendamento dos tatuadores.
        </p>
      </div>

      <NewMacaForm />

      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full min-w-[360px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-800 text-neutral-500">
              <th className="py-3 pl-4 pr-4 font-medium">Nome</th>
              <th className="py-3 pr-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(macas ?? []).map((maca) => (
              <MacaRow key={maca.id} maca={maca} />
            ))}
          </tbody>
        </table>
        {(macas ?? []).length === 0 && (
          <p className="p-6 text-center text-neutral-500">
            Nenhuma maca cadastrada ainda.
          </p>
        )}
      </div>
    </div>
  );
}
