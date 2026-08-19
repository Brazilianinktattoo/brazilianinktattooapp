import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { AnamneseForm, Appointment } from "@/lib/types/database";

type AppointmentSummary = Pick<
  Appointment,
  "id" | "client_id" | "client_name" | "client_phone" | "starts_at"
>;

export default async function MeusClientesPage() {
  const { user, profile } = await requireProfile();
  // Tela pensada pro tatuador gerar a ficha de anamnese direto do próprio
  // cliente, sem precisar de admin/recepção — os demais papéis já têm seus
  // próprios caminhos (admin usa /clientes, o link também sai da agenda).
  if (profile.role !== "tatuador") redirect("/");

  const supabase = await createClient();
  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, client_id, client_name, client_phone, starts_at")
    .eq("collaborator_id", user.id)
    .order("starts_at", { ascending: false })
    .returns<AppointmentSummary[]>();

  // Um cliente pode ter vários agendamentos — mantém só o mais recente de
  // cada, que é onde faz sentido gerar/reenviar a ficha.
  const latestByClient = new Map<string, AppointmentSummary>();
  for (const appt of appointments ?? []) {
    const key = appt.client_id ?? `${appt.client_phone}|${appt.client_name}`;
    if (!latestByClient.has(key)) latestByClient.set(key, appt);
  }
  const clients = Array.from(latestByClient.values());

  const appointmentIds = clients.map((c) => c.id);
  const { data: forms } = appointmentIds.length
    ? await supabase
        .from("anamnese_forms")
        .select("appointment_id, signed_at")
        .in("appointment_id", appointmentIds)
        .returns<Pick<AnamneseForm, "appointment_id" | "signed_at">[]>()
    : { data: [] as Pick<AnamneseForm, "appointment_id" | "signed_at">[] };
  const formByAppointment = new Map(
    (forms ?? []).map((f) => [f.appointment_id, f])
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Meus clientes</h1>
        <p className="text-neutral-400">
          Clientes dos seus agendamentos. Gere e envie a ficha de anamnese
          direto por aqui, sem precisar de admin ou recepção.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-gold-soft/20 text-neutral-500">
              <th className="py-3 pl-4 pr-4 font-medium">Cliente</th>
              <th className="py-3 pr-4 font-medium">Telefone</th>
              <th className="py-3 pr-4 font-medium">Último agendamento</th>
              <th className="py-3 pr-4 font-medium">Ficha de anamnese</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => {
              const form = formByAppointment.get(c.id);
              return (
                <tr key={c.id} className="border-b border-neutral-800">
                  <td className="py-3 pl-4 pr-4 text-neutral-100">
                    {c.client_name}
                  </td>
                  <td className="py-3 pr-4 text-neutral-300">
                    {c.client_phone || "—"}
                  </td>
                  <td className="py-3 pr-4 text-neutral-300">
                    {new Date(c.starts_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="py-3 pr-4">
                    <Link
                      href={`/agendamentos/${c.id}/anamnese`}
                      className="rounded-lg border border-neutral-700 px-3 py-1.5 text-neutral-200 hover:border-gold-soft hover:text-gold"
                    >
                      {form?.signed_at
                        ? "Ver ficha"
                        : form
                          ? "Ver link"
                          : "Gerar e enviar ficha"}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {clients.length === 0 && (
          <p className="p-6 text-center text-neutral-500">
            Você ainda não tem clientes agendados.
          </p>
        )}
      </div>
    </div>
  );
}
