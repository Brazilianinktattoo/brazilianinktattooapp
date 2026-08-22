"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireAdminOrChefePiercing } from "@/lib/auth";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types/database";

export type CreateCollaboratorState = {
  error?: string;
  success?: boolean;
};

const ROLES: UserRole[] = ["admin", "tatuador", "piercer", "chefe_piercing"];

// Chefe de Piercing só mexe em colaboradores que já são (ou vão ser) body
// piercer. Os server actions abaixo usam a service_role (bypassa RLS), então
// essa checagem tem que existir aqui — não dá pra confiar só na policy.
async function getTargetRole(id: string): Promise<UserRole | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", id)
    .maybeSingle();
  return data?.role ?? null;
}

export async function createCollaborator(
  _prevState: CreateCollaboratorState,
  formData: FormData
): Promise<CreateCollaboratorState> {
  const { profile } = await requireAdminOrChefePiercing();
  const isChefePiercing = profile.role === "chefe_piercing";

  const full_name = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const address = String(formData.get("address") ?? "").trim();
  const cpf = String(formData.get("cpf") ?? "").trim();
  const role = isChefePiercing
    ? "piercer"
    : (String(formData.get("role") ?? "") as UserRole);

  if (!full_name || !email || !password) {
    return { error: "Preencha nome, e-mail e senha." };
  }
  if (password.length < 6) {
    return { error: "A senha precisa ter pelo menos 6 caracteres." };
  }
  if (!ROLES.includes(role)) {
    return { error: "Selecione um nível de acesso válido." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role },
  });

  if (error) {
    return {
      error: error.message.includes("already been registered")
        ? "Já existe um colaborador com esse e-mail."
        : "Não foi possível criar o acesso. Tente novamente.",
    };
  }

  // Endereço/CPF não fazem parte do trigger handle_new_user (só
  // full_name/email/role) — completa com um update logo em seguida.
  if (data.user && (address || cpf)) {
    await admin
      .from("profiles")
      .update({ address: address || null, cpf: cpf || null })
      .eq("id", data.user.id);
  }

  revalidatePath("/colaboradores");
  return { success: true };
}

export async function updateCollaboratorRole(id: string, role: UserRole) {
  // só admin promove/rebaixa colaborador — chefe_piercing nunca muda papel
  await requireAdmin();
  if (!ROLES.includes(role)) return;

  const supabase = await createClient();
  await supabase.from("profiles").update({ role }).eq("id", id);
  revalidatePath("/colaboradores");
}

export async function updateCollaboratorBirthday(id: string, birthday: string) {
  const { profile } = await requireAdminOrChefePiercing();
  if (profile.role === "chefe_piercing") {
    if ((await getTargetRole(id)) !== "piercer") return;
  }

  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ birthday: birthday || null })
    .eq("id", id);
  revalidatePath("/colaboradores");
}

export async function updateCollaboratorAddress(id: string, address: string) {
  const { profile } = await requireAdminOrChefePiercing();
  if (profile.role === "chefe_piercing") {
    if ((await getTargetRole(id)) !== "piercer") return;
  }

  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ address: address.trim() || null })
    .eq("id", id);
  revalidatePath("/colaboradores");
}

export async function updateCollaboratorCpf(id: string, cpf: string) {
  const { profile } = await requireAdminOrChefePiercing();
  if (profile.role === "chefe_piercing") {
    if ((await getTargetRole(id)) !== "piercer") return;
  }

  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ cpf: cpf.trim() || null })
    .eq("id", id);
  revalidatePath("/colaboradores");
}

export async function updateCollaboratorName(id: string, full_name: string) {
  const { profile } = await requireAdminOrChefePiercing();
  if (!full_name.trim()) return;
  if (profile.role === "chefe_piercing") {
    if ((await getTargetRole(id)) !== "piercer") return;
  }

  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ full_name: full_name.trim() })
    .eq("id", id);
  revalidatePath("/colaboradores");
}

export type UpdateEmailState = {
  error?: string;
  success?: boolean;
};

export async function updateCollaboratorEmail(
  id: string,
  _prevState: UpdateEmailState,
  formData: FormData
): Promise<UpdateEmailState> {
  const { profile } = await requireAdminOrChefePiercing();
  if (profile.role === "chefe_piercing") {
    if ((await getTargetRole(id)) !== "piercer") {
      return { error: "Sem permissão para editar esse colaborador." };
    }
  }

  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Informe um e-mail." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, { email });
  if (error) {
    return {
      error: error.message.includes("already been registered")
        ? "Já existe um colaborador com esse e-mail."
        : "Não foi possível trocar o e-mail.",
    };
  }

  revalidatePath("/colaboradores");
  return { success: true };
}

export async function setCollaboratorActive(id: string, active: boolean) {
  const { user, profile } = await requireAdminOrChefePiercing();
  if (id === user.id && !active) {
    // don't let an admin/chefe lock themselves out
    return;
  }
  if (profile.role === "chefe_piercing") {
    if ((await getTargetRole(id)) !== "piercer") return;
  }

  const supabase = await createClient();
  await supabase.from("profiles").update({ active }).eq("id", id);
  revalidatePath("/colaboradores");
}

// Só Admin edita quem aparece na lista de profissionais da Ficha de
// Anamnese com URL fixa (QR Code) — pedido explícito, mesmo chefe_piercing
// não mexe aqui.
export async function setQrAnamneseEnabled(id: string, enabled: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("profiles").update({ qr_anamnese_enabled: enabled }).eq("id", id);
  revalidatePath("/colaboradores");
}

function percentToRate(percent: number | null): number | null {
  return percent === null ? null : Math.round(percent) / 100;
}

// Taxa fixa de comissão sobre serviços por colaborador, só Admin edita
// (tela /comissoes). null volta a usar a regra automática por
// unidade/origem do cliente (ver commissionRate em lib/commission.ts).
export async function updateCollaboratorCommissionRate(
  id: string,
  ratePercent: number | null
) {
  await requireAdmin();
  if (ratePercent !== null && (Number.isNaN(ratePercent) || ratePercent < 0 || ratePercent > 100)) {
    return;
  }
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ commission_rate: percentToRate(ratePercent) })
    .eq("id", id);
  revalidatePath("/comissoes");
}

// Taxa de comissão sobre venda de jóia (Chefe de Piercing/Body Piercer) —
// independente da comissão sobre serviço. null = sem comissão sobre jóia.
export async function updateCollaboratorSalesCommissionRate(
  id: string,
  ratePercent: number | null
) {
  await requireAdmin();
  if (ratePercent !== null && (Number.isNaN(ratePercent) || ratePercent < 0 || ratePercent > 100)) {
    return;
  }
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ commission_rate_sales: percentToRate(ratePercent) })
    .eq("id", id);
  revalidatePath("/comissoes");
}

export type DeleteCollaboratorResult = {
  error?: string;
  success?: boolean;
};

// Só existe de verdade pra Tatuador/Body Piercer sem histórico — o banco
// bloqueia (por design) excluir quem já tem agendamento/comanda vinculada,
// pra não perder registro financeiro. Nesse caso orientamos a usar
// "Desativar", que já existe.
export async function deleteCollaborator(id: string): Promise<DeleteCollaboratorResult> {
  await requireAdmin();

  const targetRole = await getTargetRole(id);
  if (targetRole !== "tatuador" && targetRole !== "piercer") {
    return { error: "Só é possível excluir Tatuador ou Body Piercer." };
  }

  const supabase = await createClient();
  const [{ count: apptCount }, { count: comandaCount }] = await Promise.all([
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("collaborator_id", id),
    supabase
      .from("comandas")
      .select("id", { count: "exact", head: true })
      .eq("collaborator_id", id),
  ]);
  if ((apptCount ?? 0) > 0 || (comandaCount ?? 0) > 0) {
    return {
      error:
        "Esse colaborador já tem agendamentos ou comandas — não dá pra excluir sem perder histórico. Use \"Desativar\" em vez disso.",
    };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return { error: "Não foi possível excluir o colaborador." };

  revalidatePath("/colaboradores");
  return { success: true };
}

export type ResetPasswordState = {
  error?: string;
  success?: boolean;
};

export async function resetCollaboratorPassword(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const { profile } = await requireAdminOrChefePiercing();

  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!id || password.length < 6) {
    return { error: "A nova senha precisa ter pelo menos 6 caracteres." };
  }
  if (profile.role === "chefe_piercing") {
    if ((await getTargetRole(id)) !== "piercer") {
      return { error: "Sem permissão para editar esse colaborador." };
    }
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) {
    return { error: "Não foi possível trocar a senha." };
  }

  return { success: true };
}
