import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAppointment } from "@/app/actions/agenda";
import type { Maca, Profile, Unit } from "@/lib/types/database";
import { todayParam } from "@/lib/date";
import { AppointmentForm } from "../appointment-form";

export default async function NovoAgendamentoPage(props: PageProps<"/agendamentos/novo">) {
  const searchParams = await props.searchParams;
  const { user, profile } = await requireProfile();

  const defaultDate =
    typeof searchParams.date === "string" ? searchParams.date : todayParam();

  const supabase = await createClient();
  const [{ data: collaborators }, { data: units }, { data: macas }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("active", true)
        .order("full_name")
        .returns<Pick<Profile, "id" | "full_name" | "role">[]>(),
      supabase
        .from("units")
        .select("*")
        .eq("active", true)
        .order("name")
        .returns<Unit[]>(),
      supabase
        .from("macas")
        .select("*")
        .eq("active", true)
        .order("label")
        .returns<Maca[]>(),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-white">Novo agendamento</h1>
      <AppointmentForm
        action={createAppointment}
        collaborators={collaborators ?? []}
        units={units ?? []}
        macas={macas ?? []}
        currentUser={{ id: user.id, role: profile.role }}
        defaultDate={defaultDate}
      />
    </div>
  );
}
