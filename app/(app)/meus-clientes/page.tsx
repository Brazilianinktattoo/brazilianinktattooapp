import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ViewFichaButton } from "../view-ficha-button";
import type { AnamneseForm, Appointment, Client } from "@/lib/types/database";

type AppointmentSummary = Pick<
  Appointment,
  "id" | "client_id" | "client_name" | "client_phone" | "starts_at"
>;

export default async function MeusClientesPage() {
  const { user, profile } = await requireProfile();
  // Tela pensada pro tatuador/chefe de piercing gerarem a ficha de anamnese
  // direto do próprio cliente, sem precisar de admin/recepção — os demais
  // papéis já têm seus próprios caminhos (admin usa /clientes, o link
  // também sai da agenda).
  if (profile.role !== "tatuador" && profile.role !== "chefe_piercing") {
    redirect("/");
  }

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
  const scheduled = Array.from(latestByClient.values());
  const scheduledPhones = new Set(scheduled.map((c) => c.client_phone).filter(Boolean));

  const appointmentIds = scheduled.map((c) => c.id);
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

  // Fichas preenchidas pelo cliente direto no link fixo (QR Code),
  // escolhendo esse tatuador — ainda sem agendamento, ficam aqui até ele
  // abrir o atendimento.
  const { data: walkinClients } = await supabase
    .from("clients")
    .select("*")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .returns<Client[]>();

  const pendingClients = (walkinClients ?? []).filter(
    (c) => !scheduledPhones.has(c.phone)
  );

  const { data: walkinForms } = pendingClients.length
    ? await supabase
        .from("anamnese_forms")
        .select("phone, file_path, signed_at")
        .eq("collaborator_id", user.id)
        .is("appointment_id", null)
        .returns<Pick<AnamneseForm, "phone" | "file_path" | "signed_at">[]>()
    : { data: [] as Pick<AnamneseForm, "phone" | "file_path" | "signed_at">[] };
  const walkinFormByPhone = new Map((walkinForms ?? []).map((f) => [f.phone, f]));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Meus clientes</h1>
        <p className="text-neutral-400">
          Clientes dos seus agendamentos. Gere e envie a ficha de anamnese
          direto por aqui, sem precisar de admin ou recepção.
        </p>
      </div>

      {pendingClients.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-neutral-300">
            Fichas recebidas — aguardando agendamento
          </h2>
          <div className="overflow-x-auto rounded-xl border border-gold-soft/30">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-gold-soft/20 text-neutral-500">
                  <th className="py-3 pl-4 pr-4 font-medium">Cliente</th>
                  <th className="py-3 pr-4 font-medium">Telefone</th>
                  <th className="py-3 pr-4 font-medium">Ficha</th>
                  <th className="py-3 pr-4 font-medium" />
                </tr>
              </thead>
              <tbody>
                {pendingClients.map((c) => {
                  const form = walkinFormByPhone.get(c.phone);
                  return (
                    <tr key={c.id} className="border-b border-neutral-800">
                      <td className="py-3 pl-4 pr-4 text-neutral-100">
                        {c.full_name}
                      </td>
                      <td className="py-3 pr-4 text-neutral-300">
                        {c.phone || "—"}
                      </td>
                      <td className="py-3 pr-4">
                        {form?.file_path ? (
                          <ViewFichaButton filePath={form.file_path} />
                        ) : (
                          <span className="text-neutral-500">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <Link
                          href={`/agendamentos/novo?client_name=${encodeURIComponent(
                            c.full_name
                          )}&client_phone=${encodeURIComponent(c.phone)}`}
                          className="rounded-lg bg-gradient-to-b from-gold-strong to-gold px-3 py-1.5 text-sm font-medium text-neutral-950 transition hover:to-copper"
                        >
                          Criar agendamento
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        {pendingClients.length > 0 && (
          <h2 className="mb-3 text-sm font-medium text-neutral-300">
            Clientes agendados
          </h2>
        )}
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
              {scheduled.map((c) => {
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
          {scheduled.length === 0 && (
            <p className="p-6 text-center text-neutral-500">
              Você ainda não tem clientes agendados.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
