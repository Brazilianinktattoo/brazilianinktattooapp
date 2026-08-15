"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function openComanda(formData: FormData) {
  const { user, profile } = await requireProfile();
  const appointment_id = String(formData.get("appointment_id") ?? "");
  if (!appointment_id) return;

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("comandas")
    .select("id")
    .eq("appointment_id", appointment_id)
    .maybeSingle();

  if (existing) redirect(`/comandas/${existing.id}`);

  const { data: appt } = await supabase
    .from("appointments")
    .select("collaborator_id")
    .eq("id", appointment_id)
    .maybeSingle();

  if (!appt) return;
  if (appt.collaborator_id !== user.id && profile.role !== "admin") return;

  const { data: comanda, error } = await supabase
    .from("comandas")
    .insert({ appointment_id })
    .select("id")
    .single();

  if (error || !comanda) return;

  revalidatePath("/");
  redirect(`/comandas/${comanda.id}`);
}

export async function closeComanda(comandaId: string) {
  await requireProfile();
  const supabase = await createClient();
  await supabase
    .from("comandas")
    .update({ status: "fechada" })
    .eq("id", comandaId);
  revalidatePath(`/comandas/${comandaId}`);
  revalidatePath("/");
}

export type ComandaServiceState = {
  error?: string;
};

export async function addService(
  comandaId: string,
  _prevState: ComandaServiceState,
  formData: FormData
): Promise<ComandaServiceState> {
  await requireProfile();

  const description = String(formData.get("description") ?? "").trim();
  const price_raw = String(formData.get("price") ?? "0").replace(",", ".");

  if (!description) return { error: "Descreva o serviço." };

  const price = Number(price_raw);
  if (Number.isNaN(price) || price < 0) return { error: "Valor inválido." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("comanda_services")
    .insert({ comanda_id: comandaId, description, price });

  if (error) {
    return {
      error: error.message.includes("fechada")
        ? "Comanda fechada, não é possível editar."
        : "Não foi possível adicionar o serviço.",
    };
  }

  revalidatePath(`/comandas/${comandaId}`);
  return {};
}

export async function removeService(comandaId: string, serviceId: string) {
  await requireProfile();
  const supabase = await createClient();
  await supabase.from("comanda_services").delete().eq("id", serviceId);
  revalidatePath(`/comandas/${comandaId}`);
}

export type ComandaProductState = {
  error?: string;
};

export async function addProduct(
  comandaId: string,
  _prevState: ComandaProductState,
  formData: FormData
): Promise<ComandaProductState> {
  await requireProfile();

  const product_id = String(formData.get("product_id") ?? "");
  const quantity_raw = String(formData.get("quantity") ?? "").replace(",", ".");
  const unit_price_raw = String(formData.get("unit_price") ?? "0").replace(
    ",",
    "."
  );

  if (!product_id) return { error: "Selecione o produto." };

  const quantity = Number(quantity_raw);
  if (Number.isNaN(quantity) || quantity <= 0) {
    return { error: "Quantidade inválida." };
  }

  const unit_price = Number(unit_price_raw);
  if (Number.isNaN(unit_price) || unit_price < 0) {
    return { error: "Valor inválido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("comanda_products").insert({
    comanda_id: comandaId,
    product_id,
    quantity,
    unit_price,
  });

  if (error) {
    if (error.message.includes("Estoque insuficiente")) {
      return { error: "Estoque insuficiente para esse produto." };
    }
    if (error.message.includes("fechada")) {
      return { error: "Comanda fechada, não é possível editar." };
    }
    return { error: "Não foi possível adicionar o produto." };
  }

  revalidatePath(`/comandas/${comandaId}`);
  return {};
}

export async function removeProduct(comandaId: string, lineId: string) {
  await requireProfile();
  const supabase = await createClient();
  await supabase.from("comanda_products").delete().eq("id", lineId);
  revalidatePath(`/comandas/${comandaId}`);
}
