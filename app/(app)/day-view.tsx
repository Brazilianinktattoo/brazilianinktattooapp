import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { AppointmentWithRelations } from "@/lib/types/database";
import { dayBounds, formatDateLabel, shiftDate, todayParam } from "@/lib/date";
import { AppointmentRow } from "./appointment-row";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  tatuador: "Tatuador(a)",
  piercer: "Body Piercer",
  chefe_piercing: "Chefe de Piercing",
  visitante: "Visitante",
};

export async function DayView({
  dateParam,
  user,
  profile,
}: {
  dateParam: string;
  user: Awaited<ReturnType<typeof requireProfile>>["user"];
  profile: Awaited<ReturnType<typeof requireProfile>>["profile"];
}) {
  const { start, end } = dayBounds(dateParam);

  const supabase = await createClient();
  const { data: appointments } = await supabase
    .from("appointments")
    .select(
      "*, collaborator:profiles!appointments_collaborator_id_fkey(id, full_name, role), maca:macas(id, label), unit:units(id, name)"
    )
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString())
    .order("starts_at", { ascending: true })
    .returns<AppointmentWithRelations[]>();

  const list = appointments ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Agenda</h1>
          <p className="text-neutral-400 capitalize">
            {formatDateLabel(dateParam)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/?date=${shiftDate(dateParam, -1)}`}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-gold-soft hover:text-gold"
          >
            ← Anterior
          </Link>
          <Link
            href={`/?date=${todayParam()}`}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-gold-soft hover:text-gold"
          >
            Hoje
          </Link>
          <Link
            href={`/?date=${shiftDate(dateParam, 1)}`}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-gold-soft hover:text-gold"
          >
            Próximo →
          </Link>
          <Link
            href={`/agendamentos/novo?date=${dateParam}`}
            className="ml-2 rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-1.5 text-sm font-medium text-neutral-950 hover:to-copper"
          >
            + Novo agendamento
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-gold-soft/20 text-neutral-500">
              <th className="py-3 pl-4 pr-4 font-medium">Horário</th>
              <th className="py-3 pr-4 font-medium">Unidade</th>
              <th className="py-3 pr-4 font-medium">Colaborador</th>
              <th className="py-3 pr-4 font-medium">Cliente</th>
              <th className="py-3 pr-4 font-medium">Maca</th>
              <th className="py-3 pr-4 font-medium">Status</th>
              <th className="py-3 pr-4 font-medium">Sinal</th>
              <th className="py-3 pr-4 font-medium" />
            </tr>
          </thead>
          <tbody>
            {list.map((appt) => (
              <AppointmentRow
                key={appt.id}
                appointment={appt}
                canEdit={
                  appt.collaborator_id === user.id || profile.role === "admin"
                }
                isAdmin={profile.role === "admin"}
                roleLabel={ROLE_LABEL}
              />
            ))}
          </tbody>
        </table>
        {list.length === 0 && (
          <p className="p-6 text-center text-neutral-500">
            Nenhum agendamento nesse dia.
          </p>
        )}
      </div>
    </div>
  );
}
