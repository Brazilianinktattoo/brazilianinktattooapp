"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireProfile } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { feeRatePercentFor, computeChargedAmount, PAYMENT_METHOD_LABEL } from "@/lib/fees";
import { commissionRate, resolveClientIsOwn, salesCommissionRate } from "@/lib/commission";
import { computeCommissionDeadline } from "@/lib/commission-deadline";
import { normalizePhone } from "@/lib/phone";
import { sendTemplateMessage } from "@/lib/whatsapp/meta-client";
import type { CardFeeRate, ClientOrigin, PaymentMethod } from "@/lib/types/database";

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

  await notifyAdminsOfComandaOpened(supabase, comanda.id);

  revalidatePath("/");
  redirect(`/comandas/${comanda.id}`);
}

export type OpenComandaFromClientState = {
  error?: string;
};

// Abre uma comanda sem agendamento prévio — a única exigência é uma ficha
// de anamnese já assinada pra esse telefone. Cria um agendamento "de
// bastidores" (mesma estrutura de sempre, horário = agora) só pra manter a
// comanda presa a um agendamento como o resto do sistema já espera
// (relatórios, comissão, macas etc.), sem o colaborador precisar passar
// pelo formulário completo de agendamento.
export async function openComandaFromClient(
  _prevState: OpenComandaFromClientState,
  formData: FormData
): Promise<OpenComandaFromClientState> {
  const { user, profile } = await requireProfile();

  const client_name = String(formData.get("client_name") ?? "").trim();
  const client_phone = normalizePhone(String(formData.get("client_phone") ?? ""));
  const collaborator_id = String(formData.get("collaborator_id") ?? "") || user.id;
  const unit_id = String(formData.get("unit_id") ?? "");
  const maca_id = String(formData.get("maca_id") ?? "") || null;
  const total_amount_raw = String(formData.get("total_amount") ?? "").trim().replace(",", ".");
  const deposit_amount_raw = String(formData.get("deposit_amount") ?? "").trim().replace(",", ".");
  const deposit_status = formData.get("deposit_status") === "pago" ? "pago" : "pendente";

  if (!client_name || !client_phone) {
    return { error: "Cliente inválido — volte e tente de novo." };
  }
  if (!unit_id) return { error: "Selecione a unidade." };
  if (total_amount_raw === "" || deposit_amount_raw === "") {
    return { error: "Preencha o valor total e o valor do sinal (0,00 se não teve sinal)." };
  }
  const total_amount = Number(total_amount_raw);
  const deposit_amount = Number(deposit_amount_raw);
  if (Number.isNaN(total_amount) || total_amount < 0) {
    return { error: "Valor total inválido." };
  }
  if (Number.isNaN(deposit_amount) || deposit_amount < 0) {
    return { error: "Valor do sinal inválido." };
  }

  const supabase = await createClient();

  const { data: collaborator } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", collaborator_id)
    .maybeSingle();
  if (!collaborator) return { error: "Profissional inválido." };

  const isPiercingRole = collaborator.role === "piercer" || collaborator.role === "chefe_piercing";
  const canActAs =
    collaborator_id === user.id ||
    profile.role === "admin" ||
    (profile.role === "chefe_piercing" && isPiercingRole);
  if (!canActAs) return { error: "Sem permissão pra abrir comanda pra esse profissional." };

  if ((collaborator.role === "tatuador" || collaborator.role === "admin") && !maca_id) {
    return { error: "Selecione a maca." };
  }

  const { data: anamnese } = await supabase
    .from("anamnese_forms")
    .select("client_origin, signed_at")
    .eq("phone", client_phone)
    .not("signed_at", "is", null)
    .order("signed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Chefe de Piercing/Body Piercer só precisam da ficha quando o
  // atendimento envolve perfuração — venda avulsa de jóia ou outro
  // serviço não exige. Tatuador/Admin continuam exigindo sempre.
  const involvesPiercing = formData.get("involves_piercing") === "on";
  const requiresAnamnese = !isPiercingRole || involvesPiercing;

  if (requiresAnamnese && !anamnese) {
    return {
      error:
        "Esse cliente ainda não tem ficha de anamnese preenchida — gere e envie a ficha antes de abrir a comanda.",
    };
  }

  const { data: existingClient } = await supabase
    .from("clients")
    .select("id")
    .eq("phone", client_phone)
    .maybeSingle();
  const client_id = existingClient?.id ?? null;

  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .insert({
      collaborator_id,
      unit_id,
      maca_id,
      client_id,
      client_name,
      client_phone,
      client_is_own: anamnese?.client_origin === "trazido_pelo_tatuador",
      notes: anamnese
        ? "Comanda aberta direto da ficha de anamnese, sem agendamento prévio."
        : "Comanda aberta sem agendamento prévio — sem perfuração, ficha de anamnese não exigida.",
      starts_at: now.toISOString(),
      ends_at: oneHourLater.toISOString(),
      total_amount,
      deposit_amount,
      deposit_status,
    })
    .select("id")
    .single();

  if (appointmentError || !appointment) {
    const msg = appointmentError?.message ?? "";
    let friendlyError = "Não foi possível abrir a comanda.";
    if (msg.includes("atravessar a meia-noite")) {
      friendlyError = "O agendamento de maca não pode atravessar a meia-noite.";
    } else if (msg.includes("maca")) {
      friendlyError = "Maca inválida pra esse profissional/unidade.";
    }
    return { error: friendlyError };
  }

  const { data: comanda, error: comandaError } = await supabase
    .from("comandas")
    .insert({ appointment_id: appointment.id })
    .select("id")
    .single();

  if (comandaError || !comanda) {
    return { error: "Não foi possível abrir a comanda." };
  }

  await notifyAdminsOfComandaOpened(supabase, comanda.id);

  revalidatePath("/");
  redirect(`/comandas/${comanda.id}`);
}

// Exclusão permanente — só Admin. Serviços/produtos/jóias da comanda saem
// junto (on delete cascade); o agendamento em si não é afetado.
export async function deleteComanda(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("comandas")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error || !count) {
    throw new Error("Não foi possível excluir a comanda.");
  }
  revalidatePath("/comandas");
  redirect("/comandas");
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

  const chargedAmount = computeChargedAmount(gross, feeRatePercent);

  const { error } = await supabase
    .from("comandas")
    .update({
      status: "fechada",
      payment_method,
      installments,
      fee_rate_percent: feeRatePercent,
      gross_amount: gross,
      charged_amount: chargedAmount,
    })
    .eq("id", comandaId);

  if (error) return { error: "Não foi possível fechar a comanda." };

  const servicesGross = (services ?? []).reduce((s, i) => s + i.price, 0);
  const jewelryGross = (jewelryLines ?? []).reduce((s, i) => s + i.value, 0);
  const paidAt = new Date();
  await notifyAdminsOfCommissionDue(
    supabase,
    comandaId,
    servicesGross,
    jewelryGross,
    payment_method,
    paidAt
  );

  revalidatePath(`/comandas/${comandaId}`);
  revalidatePath("/");
  return {};
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Avisa todos os admins ativos sempre que uma comanda é aberta (pelas duas
// vias: a partir de um agendamento ou direto pela ficha). Best-effort —
// falha aqui não pode impedir a abertura da comanda.
async function notifyAdminsOfComandaOpened(
  supabase: SupabaseServerClient,
  comandaId: string
) {
  try {
    const { data: info } = await supabase
      .from("comandas")
      .select(
        "appointment_id, collaborator:profiles!comandas_collaborator_id_fkey(full_name), unit:units(name), appointment:appointments!comandas_appointment_id_fkey(client_name)"
      )
      .eq("id", comandaId)
      .maybeSingle<{
        appointment_id: string;
        collaborator: { full_name: string } | null;
        unit: { name: string } | null;
        appointment: { client_name: string } | null;
      }>();

    if (!info) return;

    const collaboratorName = info.collaborator?.full_name || "Colaborador(a)";
    const clientName = info.appointment?.client_name || "cliente";
    const unitName = info.unit?.name || "—";
    const message = `Comanda aberta: ${collaboratorName} — ${clientName} (${unitName}).`;

    const admin = createAdminClient();
    const { data: admins } = await admin
      .from("profiles")
      .select("id, whatsapp_phone")
      .eq("role", "admin")
      .eq("active", true);

    if (!admins || admins.length === 0) return;

    await admin.from("notifications").insert(
      admins.map((a) => ({
        profile_id: a.id,
        appointment_id: info.appointment_id,
        message,
      }))
    );

    // Envio imediato (não pela fila diária do cron) — best-effort, uma
    // falha de WhatsApp não afeta o sininho nem a abertura da comanda. Usa
    // modelo aprovado pela Meta (funciona mesmo fora da janela de 24h).
    await Promise.all(
      admins
        .filter((a) => a.whatsapp_phone)
        .map((a) =>
          sendTemplateMessage(a.whatsapp_phone!, "comanda_aberta_admin", [
            collaboratorName,
            clientName,
            unitName,
          ]).catch(() => null)
        )
    );
  } catch {
    // best-effort — não deixa um erro de notificação impedir a abertura
  }
}

// Comissão sobre serviço (tatuagem/piercing) + comissão sobre venda de
// jóia (Chefe de Piercing/Body Piercer, taxa separada — ver
// lib/commission.ts); produtos ficam de fora. Falha aqui não pode derrubar
// o fechamento da comanda, então é só um aviso best-effort.
async function notifyAdminsOfCommissionDue(
  supabase: SupabaseServerClient,
  comandaId: string,
  servicesGross: number,
  jewelryGross: number,
  paymentMethod: PaymentMethod,
  paidAt: Date
) {
  if (servicesGross <= 0 && jewelryGross <= 0) return;

  try {
    const { data: comandaInfo } = await supabase
      .from("comandas")
      .select(
        "appointment_id, collaborator:profiles!comandas_collaborator_id_fkey(full_name, role, commission_rate, commission_rate_sales), unit:units(name), appointment:appointments!comandas_appointment_id_fkey(client_is_own, anamnese_forms(client_origin, signed_at))"
      )
      .eq("id", comandaId)
      .maybeSingle<{
        appointment_id: string;
        collaborator: {
          full_name: string;
          role: string;
          commission_rate: number | null;
          commission_rate_sales: number | null;
        } | null;
        unit: { name: string } | null;
        appointment: {
          client_is_own: boolean;
          anamnese_forms: { client_origin: ClientOrigin | null; signed_at: string | null } | null;
        } | null;
      }>();

    if (!comandaInfo?.collaborator || !comandaInfo.unit) return;

    const clientIsOwn = resolveClientIsOwn(
      comandaInfo.appointment?.client_is_own ?? false,
      comandaInfo.appointment?.anamnese_forms?.client_origin,
      comandaInfo.appointment?.anamnese_forms?.signed_at
    );
    const isPiercingRole =
      comandaInfo.collaborator.role === "piercer" ||
      comandaInfo.collaborator.role === "chefe_piercing";
    const rate = commissionRate(
      comandaInfo.unit.name,
      clientIsOwn,
      comandaInfo.collaborator.commission_rate,
      !isPiercingRole
    );
    const salesRate = salesCommissionRate(comandaInfo.collaborator.commission_rate_sales);
    const commissionAmount =
      Math.round(servicesGross * rate * 100) / 100 +
      Math.round(jewelryGross * salesRate * 100) / 100;
    if (commissionAmount <= 0) return;
    const deadline = computeCommissionDeadline(paymentMethod, paidAt);

    const amountLabel = commissionAmount.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
    const deadlineLabel = deadline.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });
    const message = `Comissão devida a ${comandaInfo.collaborator.full_name || "colaborador(a)"}: ${amountLabel} (${PAYMENT_METHOD_LABEL[paymentMethod]}). Prazo até ${deadlineLabel}.`;

    const admin = createAdminClient();
    const { data: admins } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .eq("active", true);

    if (!admins || admins.length === 0) return;

    await admin.from("notifications").insert(
      admins.map((a) => ({
        profile_id: a.id,
        appointment_id: comandaInfo.appointment_id,
        message,
      }))
    );
  } catch {
    // best-effort — não deixa um erro de notificação invalidar o fechamento
  }
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

// Ajuste manual do valor de comissão — só admin. null volta a usar o
// cálculo automático (regra 70%/50%).
export async function updateComandaCommission(comandaId: string, amount: number | null) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase
    .from("comandas")
    .update({ commission_amount: amount })
    .eq("id", comandaId);
  revalidatePath(`/comandas/${comandaId}`);
}
