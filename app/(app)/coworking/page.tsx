import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CoworkingPassWithRelations, Maca, Unit } from "@/lib/types/database";
import { NewPassForm } from "./new-pass-form";
import { PassRow } from "./pass-row";

export default async function CoworkingPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: units }, { data: macas }, { data: passes }, { data: guestRows }] =
    await Promise.all([
      supabase.from("units").select("*").order("name").returns<Unit[]>(),
      supabase
        .from("macas")
        .select("*")
        .eq("active", true)
        .order("label")
        .returns<Maca[]>(),
      supabase
        .from("coworking_passes")
        .select("*, unit:units(id, name), maca:macas(id, label)")
        .order("starts_at", { ascending: false })
        .returns<CoworkingPassWithRelations[]>(),
      supabase
        .from("coworking_passes")
        .select("profile_id, guest_name, guest_contact, created_at")
        .order("created_at", { ascending: false }),
    ]);

  // Visitantes já cadastrados, pra reaproveitar o mesmo acesso em vez de
  // criar um login novo por dia — um por profile_id (o mais recente vence,
  // já que a query vem ordenada por created_at desc).
  const existingGuests = Array.from(
    new Map(
      (guestRows ?? []).map((g) => [
        g.profile_id,
        { id: g.profile_id as string, name: g.guest_name, contact: g.guest_contact },
      ])
    ).values()
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Coworking</h1>
        <p className="text-neutral-400">
          Acesso temporário pra tatuadores visitantes usarem uma maca por um
          período — sem senha, só o link. O acesso expira sozinho no fim do
          período.
        </p>
      </div>

      <NewPassForm units={units ?? []} macas={macas ?? []} existingGuests={existingGuests} />

      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-gold-soft/20 text-neutral-500">
              <th className="py-3 pl-4 pr-4 font-medium">Visitante</th>
              <th className="py-3 pr-4 font-medium">Maca</th>
              <th className="py-3 pr-4 font-medium">Período</th>
              <th className="py-3 pr-4 font-medium">Status</th>
              <th className="py-3 pr-4 font-medium">Valor fixo</th>
              <th className="py-3 pr-4 font-medium">Faturamento reportado</th>
              <th className="py-3 pr-4 font-medium" />
            </tr>
          </thead>
          <tbody>
            {(passes ?? []).map((pass) => (
              <PassRow key={pass.id} pass={pass} />
            ))}
          </tbody>
        </table>
        {(passes ?? []).length === 0 && (
          <p className="p-6 text-center text-neutral-500">
            Nenhum acesso de coworking gerado ainda.
          </p>
        )}
      </div>
    </div>
  );
}
