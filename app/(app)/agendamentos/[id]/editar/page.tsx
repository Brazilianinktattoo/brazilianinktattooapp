import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateAppointment } from "@/app/actions/agenda";
import type { Appointment, Maca, Profile } from "@/lib/types/database";
import { AppointmentForm } from "../../appointment-form";

export default async function EditarAgendamentoPage(
  props: PageProps<"/agendamentos/[id]/editar">
) {
  const { id } = await props.params;
  const { user, profile } = await requireProfile();

  const supabase = await createClient();
  const { data: appointment } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", id)
    .maybeSingle<Appointment>();

  if (!appointment) notFound();

  const canEdit =
    appointment.collaborator_id === user.id || profile.role === "admin";
  if (!canEdit) redirect("/");

  const [{ data: collaborators }, { data: macas }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("active", true)
      .order("full_name")
      .returns<Pick<Profile, "id" | "full_name" | "role">[]>(),
    supabase
      .from("macas")
      .select("*")
      .eq("active", true)
      .order("label")
      .returns<Maca[]>(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-white">Editar agendamento</h1>
      <AppointmentForm
        action={updateAppointment.bind(null, id)}
        appointment={appointment}
        collaborators={collaborators ?? []}
        macas={macas ?? []}
        currentUser={{ id: user.id, role: profile.role }}
      />
    </div>
  );
}
