"use server";

import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type UpdateMyPasswordState = {
  error?: string;
  success?: boolean;
};

export async function updateMyPassword(
  _prevState: UpdateMyPasswordState,
  formData: FormData
): Promise<UpdateMyPasswordState> {
  const { user } = await requireProfile();

  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!currentPassword || !newPassword) {
    return { error: "Preencha a senha atual e a nova senha." };
  }
  if (newPassword.length < 6) {
    return { error: "A nova senha precisa ter pelo menos 6 caracteres." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "A confirmação não bate com a nova senha." };
  }

  const supabase = await createClient();

  // Confere a senha atual antes de trocar — evita que alguém com a sessão
  // aberta num aparelho compartilhado troque a senha sem saber a atual.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  });
  if (signInError) {
    return { error: "Senha atual incorreta." };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    return { error: "Não foi possível trocar a senha. Tente novamente." };
  }

  return { success: true };
}
