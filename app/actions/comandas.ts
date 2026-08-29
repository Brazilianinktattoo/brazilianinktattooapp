"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireProfile } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { feeRatePercentFor, computeChargedAmount, PAYMENT_METHOD_LABEL } from "@/lib/fees";
import { commissionRate, resolveClientIsOwn, salesCommissionRate } from "@/lib/commission";
import { computeCommissionDeadline } from "@/lib/commission-deadline";
import { normalizePhone } from "@/lib/phone";
import { STUDIO_OFFSET } from "@/lib/date";
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

const SERVICE_TYPE_LABEL: Record<string, string> = {
  venda_joia: "Venda de jóia",
  troca_joia: "Troca de jóia",
  retirada_joia: "Retirada de jóia",
  recolocacao_joia: "Recolocação de jóia",
  led_terapia: "Led Terapia",
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
  // atendimento é uma perfuração de verdade — venda/troca/retirada/
  // recolocação de jóia e Led Terapia não são procedimento invasivo e
  // dispensam anamnese. Tatuador/Admin continuam exigindo sempre — a menos
  // que o admin confirme que o atendimento foi feito com ficha em papel
  // (atendimento especial fora do fluxo digital normal).
  const serviceType = String(formData.get("service_type") ?? "perfuracao");
  const paperAnamnese = profile.role === "admin" && formData.get("paper_anamnese") === "on";
  const requiresAnamnese = !paperAnamnese && (!isPiercingRole || serviceType === "perfuracao");

  if (requiresAnamnese && !anamnese) {
    return {
      error:
        "Esse cliente ainda não tem ficha de anamnese preenchida — gere e envie a ficha antes de abrir a comanda.",
    };
  }

  // Client de admin — o Chefe de Piercing pode estar atendendo pela
  // primeira vez um cliente que só tinha histórico de tatuagem até agora;
  // a RLS de clients só libera esse cargo pra quem já tem histórico de
  // piercing, então essa busca (só id, pra vincular o agendamento) usa o
  // client admin pra não travar antes mesmo do primeiro atendimento.
  const admin = createAdminClient();
  const { data: existingClient } = await admin
    .from("clients")
    .select("id, full_name")
    .eq("phone", client_phone)
    .maybeSingle();
  const client_id = existingClient?.id ?? null;

  // Telefone já cadastrado, mas com um nome diferente do digitado agora —
  // pode ser cadastro antigo/importado com nome errado, ou até dois
  // clientes diferentes usando o mesmo número. Não trava a abertura (o
  // atendimento não pode esperar), mas avisa o admin pra conferir e
  // corrigir o cadastro.
  const nameConflict =
    existingClient && existingClient.full_name.trim().toLowerCase() !== client_name.trim().toLowerCase()
      ? existingClient.full_name
      : null;

  // O bloqueio de agenda desse walk-in é só uma formalidade (não reserva
  // maca — maca_id é sempre nulo pra piercing) — mas o banco não deixa o
  // MESMO colaborador ter dois agendamentos "confirmado" sobrepostos
  // (appointments_no_overlap_per_collaborator), então 1h de bloqueio pra
  // toda venda de jóia/troca/retirada (transação de poucos minutos, às
  // vezes o cliente só compra e vai embora) fazia a segunda comanda do dia
  // esbarrar na primeira ainda "aberta" nesse horário. Perfuração continua
  // com 1h (procedimento de verdade); o resto usa uma janela bem mais
  // curta.
  const isQuickTransaction = isPiercingRole && serviceType !== "perfuracao";
  const blockMinutes = isQuickTransaction ? 15 : 60;

  const now = new Date();
  const blockEnds = new Date(now.getTime() + blockMinutes * 60 * 1000);

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
        : paperAnamnese
          ? "Comanda aberta sem agendamento prévio — atendimento especial com ficha de anamnese em papel (confirmado pelo admin)."
          : `Comanda aberta sem agendamento prévio — tipo: ${SERVICE_TYPE_LABEL[serviceType] ?? serviceType}, ficha de anamnese não exigida.`,
      starts_at: now.toISOString(),
      ends_at: blockEnds.toISOString(),
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
    } else if (msg.includes("appointments_no_overlap_per_collaborator")) {
      friendlyError =
        "Esse profissional ainda tem outra comanda em andamento nesse horário — feche ou finalize a anterior antes de abrir uma nova, ou espere alguns minutos.";
    }
    return { error: friendlyError };
  }

  const { data: comanda, error: comandaError } = await supabase
    .from("comandas")
    .insert({ appointment_id: appointment.id })
    .select("id")
    .single();

  if (comandaError || !comanda) {
    // Sem isso, o agendamento (já criado acima) ficava órfão — sem
    // comanda nenhuma vinculada, mas ainda "confirmado" e travando a
    // agenda do colaborador pro resto da janela, sem nenhum jeito de ver
    // isso ou desfazer pela tela.
    await supabase.from("appointments").delete().eq("id", appointment.id);
    return {
      error: `Não foi possível criar a comanda (${comandaError?.message ?? "motivo desconhecido"}).`,
    };
  }

  await notifyAdminsOfComandaOpened(supabase, comanda.id, nameConflict);

  revalidatePath("/");
  redirect(`/comandas/${comanda.id}`);
}

// Exclusão permanente — só Admin. Serviços/produtos/jóias da comanda saem
// junto (on delete cascade); o agendamento em si não é afetado.
export type DeleteComandaResult = { error?: string };

export async function deleteComanda(id: string): Promise<DeleteComandaResult> {
  const { profile } = await requireProfile();
  if (profile.role !== "admin" && profile.role !== "chefe_piercing") {
    return { error: "Sem permissão pra excluir comanda." };
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("comandas")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) {
    return { error: `Não foi possível excluir a comanda (${error.message}).` };
  }
  if (!count) {
    return {
      error:
        "Sem permissão pra excluir essa comanda específica — confere se ela é sua ou de outro body piercer, se você for Chefe de Piercing.",
    };
  }

  revalidatePath("/comandas");
  redirect("/comandas");
}

export type UpdateComandaDatesResult = { error?: string; success?: boolean };

// Admin edita a data de qualquer comanda; Chefe de Piercing só as de
// piercing (mesma regra de comandas_update_own_or_admin) — inclusive
// fechadas, já que corrigir quando um atendimento realmente aconteceu é
// exatamente o caso de uso (a trava de "só comanda aberta" é sobre editar
// serviço/produto/jóia, não sobre isso).
export async function updateComandaDates(
  id: string,
  formData: FormData
): Promise<UpdateComandaDatesResult> {
  const { profile } = await requireProfile();
  if (profile.role !== "admin" && profile.role !== "chefe_piercing") {
    return { error: "Sem permissão pra editar as datas da comanda." };
  }

  const createdAtRaw = String(formData.get("created_at") ?? "");
  const closedAtRaw = String(formData.get("closed_at") ?? "");

  if (!createdAtRaw) return { error: "Preencha a data de abertura." };
  const created_at = new Date(`${createdAtRaw}:00${STUDIO_OFFSET}`);
  if (Number.isNaN(created_at.getTime())) {
    return { error: "Data de abertura inválida." };
  }

  let closed_at: Date | null = null;
  if (closedAtRaw) {
    closed_at = new Date(`${closedAtRaw}:00${STUDIO_OFFSET}`);
    if (Number.isNaN(closed_at.getTime())) {
      return { error: "Data de fechamento inválida." };
    }
    if (closed_at < created_at) {
      return { error: "O fechamento não pode ser antes da abertura." };
    }
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("comandas")
    .update(
      { created_at: created_at.toISOString(), closed_at: closed_at?.toISOString() ?? null },
      { count: "exact" }
    )
    .eq("id", id);

  if (error) {
    return { error: `Não foi possível salvar as datas (${error.message}).` };
  }
  if (!count) {
    return {
      error:
        "Sem permissão pra editar essa comanda específica — confere se ela é sua ou de outro body piercer, se você for Chefe de Piercing.",
    };
  }

  revalidatePath(`/comandas/${id}`);
  revalidatePath("/comandas");
  return { success: true };
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
  comandaId: string,
  nameConflict?: string | null
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
    // Aviso de telefone já cadastrado com outro nome — não bloqueia a
    // abertura, só sinaliza pro admin conferir/corrigir o cadastro depois.
    const conflictNote = nameConflict
      ? ` ⚠️ Esse telefone já estava cadastrado como "${nameConflict}" — confira e corrija o cadastro se for a mesma pessoa.`
      : "";
    const message = `Comanda aberta: ${collaboratorName} — ${clientName} (${unitName}).${conflictNote}`;
    const whatsappClientName = nameConflict ? `${clientName} (nome divergente do cadastro!)` : clientName;

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
    // modelo aprovado pela Meta (funciona mesmo fora da janela de 24h). O
    // erro real (se houver) vem no próprio retorno de sendTemplateMessage —
    // sem logar isso, uma falha ficava completamente invisível.
    const results = await Promise.all(
      admins
        .filter((a) => a.whatsapp_phone)
        .map((a) =>
          sendTemplateMessage(a.whatsapp_phone!, "comanda_aberta_admin", [
            collaboratorName,
            whatsappClientName,
            unitName,
          ]).catch((err) => ({ ok: false as const, error: String(err) }))
        )
    );
    for (const r of results) {
      if (!r.ok) console.error("whatsapp: falha ao notificar admin (comanda)", r.error);
    }
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
