import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Maca, Unit } from "@/lib/types/database";
import { NewMacaForm } from "./new-maca-form";
import { MacaRow } from "./maca-row";

export default async function MacasPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: units }, { data: macas }] = await Promise.all([
    supabase.from("units").select("*").order("name").returns<Unit[]>(),
    supabase.from("macas").select("*").order("label").returns<Maca[]>(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Macas</h1>
        <p className="text-neutral-400">
          Gerencie as macas disponíveis para agendamento dos tatuadores, por
          unidade.
        </p>
      </div>

      <NewMacaForm units={units ?? []} />

      {(units ?? []).map((unit) => {
        const unitMacas = (macas ?? []).filter((m) => m.unit_id === unit.id);
        return (
          <div key={unit.id} className="flex flex-col gap-2">
            <h2 className="font-semibold text-white">{unit.name}</h2>
            <div className="overflow-x-auto rounded-xl border border-neutral-800">
              <table className="w-full min-w-[360px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gold-soft/20 text-neutral-500">
                    <th className="py-3 pl-4 pr-4 font-medium">Nome</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {unitMacas.map((maca) => (
                    <MacaRow key={maca.id} maca={maca} />
                  ))}
                </tbody>
              </table>
              {unitMacas.length === 0 && (
                <p className="p-6 text-center text-neutral-500">
                  Nenhuma maca cadastrada nessa unidade ainda.
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
