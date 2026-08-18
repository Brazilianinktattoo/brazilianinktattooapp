"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { feeRatePercentFor, computeNet } from "@/lib/fees";
import type { CardFeeRate, PaymentMethod } from "@/lib/types/database";

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

export type CloseComandaState = {
  error?: string;
};

const PAYMENT_METHODS = ["credito", "debito", "pix", "dinheiro", "paypal"];

export async function closeComanda(
  comandaId: string,
  _prevState: CloseComandaState,
  formData: FormData
): Promise<CloseComandaState> {
  await requireProfile();
  const supabase = await createClient();

  const payment_method = String(formData.get("payment_method") ?? "") as PaymentMethod;
  if (!PAYMENT_METHODS.includes(payment_method)) {
    return { error: "Selecione a forma de pagamento." };
  }

  const installmentsRaw = String(formData.get("installments") ?? "1");
  const installments = payment_method === "credito" ? Number(installmentsRaw) : 1;
  if (!Number.isInteger(installments) || installments < 1 || installments > 18) {
    return { error: "Parcelamento inválido." };
  }

  const [{ data: services }, { data: productLines }, { data: jewelryLines }] =
    await Promise.all([
      supabase.from("comanda_services").select("price").eq("comanda_id", comandaId),
      supabase
        .from("comanda_products")
        .select("quantity, unit_price")
        .eq("comanda_id", comandaId),
      supabase.from("comanda_jewelry").select("value").eq("comanda_id", comandaId),
    ]);

  const gross =
    (services ?? []).reduce((s, i) => s + i.price, 0) +
    (productLines ?? []).reduce((s, i) => s + i.quantity * i.unit_price, 0) +
    (jewelryLines ?? []).reduce((s, i) => s + i.value, 0);

  let feeRatePercent = 0;
  if (payment_method === "credito" || payment_method === "debito") {
    const { data: rates } = await supabase
      .from("card_fee_rates")
      .select("*")
      .eq("method", payment_method)
      .eq("installments", installments)
      .lte("effective_from", new Date().toISOString())
      .returns<CardFeeRate[]>();

    const rate = feeRatePercentFor(rates ?? [], payment_method, installments);
    if (rate === null) {
      return {
        error:
          payment_method === "credito"
            ? `Taxa não cadastrada para crédito ${installments}x. Cadastre em Taxas antes de fechar.`
            : "Taxa de débito não cadastrada. Cadastre em Taxas antes de fechar.",
      };
    }
    feeRatePercent = rate;
  }

  const netAmount = computeNet(gross, feeRatePercent);

  const { error } = await supabase
    .from("comandas")
    .update({
      status: "fechada",
      payment_method,
      installments,
      fee_rate_percent: feeRatePercent,
      gross_amount: gross,
      net_amount: netAmount,
    })
    .eq("id", comandaId);

  if (error) return { error: "Não foi possível fechar a comanda." };

  revalidatePath(`/comandas/${comandaId}`);
  revalidatePath("/");
  return {};
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
  const service_id = String(formData.get("service_id") ?? "") || null;

  if (!description) return { error: "Descreva o serviço." };

  const price = Number(price_raw);
  if (Number.isNaN(price) || price < 0) return { error: "Valor inválido." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("comanda_services")
    .insert({ comanda_id: comandaId, service_id, description, price });

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

export type ComandaJewelryState = {
  error?: string;
};

export async function addJewelry(
  comandaId: string,
  _prevState: ComandaJewelryState,
  formData: FormData
): Promise<ComandaJewelryState> {
  await requireProfile();

  const jewelry_catalog_id = String(formData.get("jewelry_catalog_id") ?? "") || null;
  const jewelry_name = String(formData.get("jewelry_name") ?? "").trim();
  const operationRaw = String(formData.get("operation") ?? "");
  const value_raw = String(formData.get("value") ?? "0").replace(",", ".");

  if (!jewelry_name) return { error: "Informe o tipo da jóia." };
  if (!["aplicada", "trocada", "vendida"].includes(operationRaw)) {
    return { error: "Selecione a operação." };
  }
  const operation = operationRaw as "aplicada" | "trocada" | "vendida";

  const value = Number(value_raw);
  if (Number.isNaN(value) || value < 0) return { error: "Valor inválido." };

  const supabase = await createClient();
  const { error } = await supabase.from("comanda_jewelry").insert({
    comanda_id: comandaId,
    jewelry_catalog_id,
    jewelry_name,
    operation,
    value,
  });

  if (error) {
    return {
      error: error.message.includes("fechada")
        ? "Comanda fechada, não é possível editar."
        : "Não foi possível adicionar a jóia.",
    };
  }

  revalidatePath(`/comandas/${comandaId}`);
  return {};
}

export async function removeJewelry(comandaId: string, lineId: string) {
  await requireProfile();
  const supabase = await createClient();
  await supabase.from("comanda_jewelry").delete().eq("id", lineId);
  revalidatePath(`/comandas/${comandaId}`);
}
