"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  error?: string;
};

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    // DEBUG TEMPORÁRIO — remover depois de descobrir a causa do login falhando em produção.
    const urlSample = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "undefined").slice(0, 40);
    return {
      error: `E-mail ou senha inválidos. [DEBUG: ${error?.message ?? "sem user"} | status=${error?.status ?? "-"} | url=${urlSample}]`,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("active")
    .eq("id", data.user.id)
    .single();

  if (!profile?.active) {
    await supabase.auth.signOut();
    return { error: "Este acesso foi desativado. Fale com o admin." };
  }

  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
