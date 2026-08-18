import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dayBounds, formatDateLabel, shiftDate, todayParam } from "@/lib/date";
import type { AppointmentWithRelations, Maca, Unit } from "@/lib/types/database";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  tatuador: "Tatuador(a)",
  piercer: "Body Piercer",
  chefe_piercing: "Chefe de Piercing",
  visitante: "Visitante",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function MapaPage(props: PageProps<"/mapa">) {
  const searchParams = await props.searchParams;
  await requireAdmin();

  const dateParam =
    typeof searchParams.date === "string" ? searchParams.date : todayParam();
  const { start, end } = dayBounds(dateParam);

  const supabase = await createClient();
  const [{ data: units }, { data: macas }, { data: appointments }] =
    await Promise.all([
      supabase.from("units").select("*").order("name").returns<Unit[]>(),
      supabase
        .from("macas")
        .select("*")
        .eq("active", true)
        .order("label")
        .returns<Maca[]>(),
      supabase
        .from("appointments")
        .select(
          "*, collaborator:profiles!appointments_collaborator_id_fkey(id, full_name, role), maca:macas(id, label)"
        )
        .gte("starts_at", start.toISOString())
        .lt("starts_at", end.toISOString())
        .eq("status", "confirmado")
        .order("starts_at", { ascending: true })
        .returns<AppointmentWithRelations[]>(),
    ]);

  const byMaca = new Map<string, AppointmentWithRelations[]>();
  for (const maca of macas ?? []) byMaca.set(maca.id, []);
  for (const appt of appointments ?? []) {
    if (!appt.maca_id) continue;
    byMaca.get(appt.maca_id)?.push(appt);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Mapa das macas</h1>
          <p className="text-neutral-400 capitalize">
            {formatDateLabel(dateParam)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/mapa?date=${shiftDate(dateParam, -1)}`}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-gold-soft hover:text-gold"
          >
            ← Anterior
          </Link>
          <Link
            href={`/mapa?date=${todayParam()}`}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-gold-soft hover:text-gold"
          >
            Hoje
          </Link>
          <Link
            href={`/mapa?date=${shiftDate(dateParam, 1)}`}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-gold-soft hover:text-gold"
          >
            Próximo →
          </Link>
        </div>
      </div>

      {(units ?? []).map((unit) => {
        const unitMacas = (macas ?? []).filter((m) => m.unit_id === unit.id);
        return (
          <div key={unit.id} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-white">{unit.name}</h2>
            <div className="grid grid-cols-1 gap-4 overflow-x-auto sm:grid-cols-2 lg:grid-cols-5">
              {unitMacas.map((maca) => {
                const items = byMaca.get(maca.id) ?? [];
                return (
                  <div
                    key={maca.id}
                    className="flex min-w-[220px] flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4"
                  >
                    <h3 className="font-semibold text-white">{maca.label}</h3>

                    {items.length === 0 ? (
                      <p className="text-sm text-neutral-500">
                        Livre o dia todo
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {items.map((appt, i) => {
                          const prevEnd = i > 0 ? items[i - 1].ends_at : null;
                          const gapMinutes = prevEnd
                            ? (new Date(appt.starts_at).getTime() -
                                new Date(prevEnd).getTime()) /
                              60000
                            : 0;

                          return (
                            <div key={appt.id} className="flex flex-col gap-2">
                              {prevEnd && gapMinutes > 0 && (
                                <div className="rounded-md border border-dashed border-neutral-700 px-2 py-1 text-center text-xs text-neutral-500">
                                  Livre {formatTime(prevEnd)} –{" "}
                                  {formatTime(appt.starts_at)}
                                </div>
                              )}
                              <div className="rounded-lg bg-neutral-800 px-3 py-2">
                                <div className="text-sm font-medium text-neutral-100">
                                  {formatTime(appt.starts_at)} –{" "}
                                  {formatTime(appt.ends_at)}
                                </div>
                                <div className="text-sm text-neutral-300">
                                  {appt.client_name}
                                </div>
                                <div className="text-xs text-neutral-500">
                                  {appt.collaborator?.full_name || "—"} ·{" "}
                                  {ROLE_LABEL[appt.collaborator?.role ?? ""] ??
                                    ""}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {unitMacas.length === 0 && (
                <p className="text-neutral-500">
                  Nenhuma maca ativa nessa unidade.
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
