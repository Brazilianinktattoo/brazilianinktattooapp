import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { AnamneseForm, Appointment, MinorAuthorizationForm } from "@/lib/types/database";
import { AnamneseCard } from "./anamnese-card";

export default async function AgendamentoAnamnesePage(
  props: PageProps<"/agendamentos/[id]/anamnese">
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

  const canGenerate =
    appointment.collaborator_id === user.id || profile.role === "admin";

  const { data: form } = await supabase
    .from("anamnese_forms")
    .select("*")
    .eq("appointment_id", id)
    .maybeSingle<AnamneseForm>();

  const { data: minorAuth } = form
    ? await supabase
        .from("minor_authorization_forms")
        .select("*")
        .eq("anamnese_form_id", form.id)
        .maybeSingle<MinorAuthorizationForm>()
    : { data: null };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-white">Ficha de anamnese</h1>
      <AnamneseCard
        appointmentId={id}
        clientName={appointment.client_name}
        form={form}
        minorAuth={minorAuth}
        canGenerate={canGenerate}
      />
    </div>
  );
}
