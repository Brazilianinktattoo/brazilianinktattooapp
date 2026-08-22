import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { guestLogout } from "@/app/actions/coworking";
import { freeRangesInWindow } from "@/lib/business-hours";
import type {
  AppointmentWithRelations,
  CoworkingPassWithRelations,
} from "@/lib/types/database";
import { GuestAppointmentForm } from "./guest-appointment-form";
import { GuestAppointmentRow } from "./guest-appointment-row";
import { GuestAvailability } from "./guest-availability";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Server Component: roda uma vez por request, então ler o horário atual
// aqui é seguro — só fica fora do corpo do componente pra não disparar a
// regra de pureza do react-hooks (pensada pra Client Components).
function isPassExpired(endsAt: string) {
  return Date.now() > new Date(endsAt).getTime();
}

export default async function CoworkingAgendaPage() {
  const result = await getCurrentProfile();

  if (!result || !result.profile.active) {
    redirect("/coworking/entrar/erro?motivo=invalido");
  }
  if (result.profile.role !== "visitante") {
    redirect("/");
  }

  const { user } = result;
  const supabase = await createClient();

  const { data: pass } = await supabase
    .from("coworking_passes")
    .select("*, unit:units(id, name, opens_at, closes_at), maca:macas(id, label)")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<CoworkingPassWithRelations>();

  if (!pass) {
    redirect("/coworking/entrar/erro?motivo=invalido");
  }

  const expired = isPassExpired(pass.ends_at);

  const { data: appointments } = await supabase
    .from("appointments")
    .select(
      "*, collaborator:profiles!appointments_collaborator_id_fkey(id, full_name, role), maca:macas(id, label), unit:units(id, name)"
    )
    .eq("maca_id", pass.maca_id)
    .gte("starts_at", pass.starts_at)
    .lte("starts_at", pass.ends_at)
    .order("starts_at", { ascending: true })
    .returns<AppointmentWithRelations[]>();

  const list = appointments ?? [];
  const busy = list.filter((a) => a.status === "confirmado");
  const freeDays =
    !expired && pass.unit
      ? freeRangesInWindow(
          pass.starts_at,
          pass.ends_at,
          pass.unit.opens_at,
          pass.unit.closes_at,
          busy
        )
      : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">
            Olá, {pass.guest_name}
          </h1>
          <p className="text-neutral-400">
            {pass.unit?.name ?? "—"} · {pass.maca?.label ?? "—"} ·{" "}
            {formatWhen(pass.starts_at)} – {formatWhen(pass.ends_at)}
          </p>
        </div>
        <form action={guestLogout}>
          <button
            type="submit"
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-gold-soft hover:text-gold"
          >
            Sair
          </button>
        </form>
      </div>

      {expired ? (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 text-center text-neutral-400">
          Seu período de acesso terminou. Fale com o estúdio se precisar de
          mais tempo.
        </div>
      ) : (
        <>
          <GuestAvailability days={freeDays} />
          <GuestAppointmentForm
            collaboratorId={user.id}
            unitId={pass.unit_id}
            macaId={pass.maca_id}
            minDate={pass.starts_at}
            maxDate={pass.ends_at}
          />
        </>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="font-semibold text-white">Agenda da maca no período</h2>
        {list.length === 0 && (
          <p className="text-sm text-neutral-500">
            Nenhum agendamento ainda — a maca está livre no período todo.
          </p>
        )}
        {list.map((appt) => (
          <GuestAppointmentRow
            key={appt.id}
            appointment={appt}
            isOwn={appt.collaborator_id === user.id}
          />
        ))}
      </div>
    </div>
  );
}
