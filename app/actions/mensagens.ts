"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayParam } from "@/lib/date";
import type { MessageTrigger } from "@/lib/types/database";

export async function updateMessageTemplate(
  trigger: MessageTrigger,
  body: string,
  active: boolean
) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("message_templates").update({ body, active }).eq("trigger", trigger);
  revalidatePath("/mensagens");
}

export async function markMessageSent(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase
    .from("message_queue")
    .update({ status: "enviada", sent_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/mensagens");
}

export async function cancelMessage(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("message_queue").update({ status: "cancelada" }).eq("id", id);
  revalidatePath("/mensagens");
}

export async function retryMessage(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase
    .from("message_queue")
    .update({ status: "pendente", send_attempts: 0, last_error: null })
    .eq("id", id);
  revalidatePath("/mensagens");
}

export async function generateDueMessagesNow() {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.rpc("generate_due_messages");
  revalidatePath("/mensagens");
}

export type PromoBroadcastState = {
  error?: string;
  success?: boolean;
  count?: number;
};

export async function createPromoBroadcast(
  _prevState: PromoBroadcastState,
  formData: FormData
): Promise<PromoBroadcastState> {
  const { user } = await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const tattoo_offer = String(formData.get("tattoo_offer") ?? "").trim();
  const piercing_offer = String(formData.get("piercing_offer") ?? "").trim();
  const unit_id = String(formData.get("unit_id") ?? "") || null;
  const inactiveDaysRaw = String(formData.get("inactive_days") ?? "").trim();

  if (!title || !tattoo_offer || !piercing_offer) {
    return { error: "Preencha o título e as ofertas de tatuagem e piercing." };
  }

  const template_params = [title, tattoo_offer, piercing_offer];
  const body = `${title}\n\nTatuagem: ${tattoo_offer}\nPiercing: ${piercing_offer}`;

  const supabase = await createClient();

  const { data: clients } = await supabase.from("clients").select("id");
  let eligible = (clients ?? []).map((c) => c.id);

  if (unit_id) {
    const { data: appts } = await supabase
      .from("appointments")
      .select("client_id")
      .eq("unit_id", unit_id)
      .not("client_id", "is", null);
    const clientsInUnit = new Set((appts ?? []).map((a) => a.client_id as string));
    eligible = eligible.filter((id) => clientsInUnit.has(id));
  }

  const inactiveDays = Number(inactiveDaysRaw);
  if (inactiveDaysRaw && !Number.isNaN(inactiveDays) && inactiveDays > 0) {
    const { data: visits } = await supabase
      .from("appointments")
      .select("client_id, starts_at")
      .eq("status", "confirmado")
      .not("client_id", "is", null);

    const lastVisit = new Map<string, string>();
    for (const v of visits ?? []) {
      const clientId = v.client_id as string;
      const cur = lastVisit.get(clientId);
      if (!cur || v.starts_at > cur) lastVisit.set(clientId, v.starts_at);
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - inactiveDays);

    eligible = eligible.filter((id) => {
      const lv = lastVisit.get(id);
      if (!lv) return true;
      return new Date(lv) <= cutoff;
    });
  }

  if (eligible.length === 0) {
    return { error: "Nenhum cliente encontrado com esses filtros." };
  }

  const scheduled_for = todayParam();
  const rows = eligible.map((client_id) => ({
    client_id,
    kind: "promocao",
    body,
    template_params,
    status: "pendente" as const,
    scheduled_for,
    created_by: user.id,
  }));

  const { error } = await supabase.from("message_queue").insert(rows);
  if (error) return { error: "Não foi possível adicionar à fila." };

  revalidatePath("/mensagens");
  return { success: true, count: eligible.length };
}
