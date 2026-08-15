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
};

export default async function AgendaPage(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const { user, profile } = await requireProfile();

  const dateParam =
    typeof searchParams.date === "string" ? searchParams.date : todayParam();

  const { start, end } = dayBounds(dateParam);

  const supabase = await createClient();
  const { data: appointments } = await supabase
    .from("appointments")
    .select(
      "*, collaborator:profiles!appointments_collaborator_id_fkey(id, full_name, role), maca:macas(id, label)"
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
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-neutral-500 hover:text-white"
          >
            ← Anterior
          </Link>
          <Link
            href={`/?date=${todayParam()}`}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-neutral-500 hover:text-white"
          >
            Hoje
          </Link>
          <Link
            href={`/?date=${shiftDate(dateParam, 1)}`}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-neutral-500 hover:text-white"
          >
            Próximo →
          </Link>
          <Link
            href={`/agendamentos/novo?date=${dateParam}`}
            className="ml-2 rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-500"
          >
            + Novo agendamento
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-800 text-neutral-500">
              <th className="py-3 pl-4 pr-4 font-medium">Horário</th>
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
