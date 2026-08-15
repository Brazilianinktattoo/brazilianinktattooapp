"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types/database";

export type CreateCollaboratorState = {
  error?: string;
  success?: boolean;
};

const ROLES: UserRole[] = ["admin", "tatuador", "piercer"];

export async function createCollaborator(
  _prevState: CreateCollaboratorState,
  formData: FormData
): Promise<CreateCollaboratorState> {
  await requireAdmin();

  const full_name = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "") as UserRole;

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
  const { error } = await admin.auth.admin.createUser({
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

  revalidatePath("/colaboradores");
  return { success: true };
}

export async function updateCollaboratorRole(id: string, role: UserRole) {
  await requireAdmin();
  if (!ROLES.includes(role)) return;

  const supabase = await createClient();
  await supabase.from("profiles").update({ role }).eq("id", id);
  revalidatePath("/colaboradores");
}

export async function updateCollaboratorName(id: string, full_name: string) {
  await requireAdmin();
  if (!full_name.trim()) return;

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
  await requireAdmin();

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
  const { user } = await requireAdmin();
  if (id === user.id && !active) {
    // don't let an admin lock themselves out
    return;
  }

  const supabase = await createClient();
  await supabase.from("profiles").update({ active }).eq("id", id);
  revalidatePath("/colaboradores");
}

export type ResetPasswordState = {
  error?: string;
  success?: boolean;
};

export async function resetCollaboratorPassword(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!id || password.length < 6) {
    return { error: "A nova senha precisa ter pelo menos 6 caracteres." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) {
    return { error: "Não foi possível trocar a senha." };
  }

  return { success: true };
}
