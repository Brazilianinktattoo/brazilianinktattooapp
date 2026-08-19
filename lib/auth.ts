import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";

export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) return null;

  return { user, profile };
}

// Every page/layout under app/(app) is expected to call this. Proxy already
// blocks anonymous requests, but Server Functions must not rely on that
// alone (a matcher change could silently drop coverage) — see Next.js
// data-security guide.
export async function requireProfile() {
  const result = await getCurrentProfile();
  if (!result || !result.profile.active) {
    redirect("/login");
  }
  // Visitantes (coworking) têm sua própria área mínima e nunca devem cair
  // nas telas normais do estúdio.
  if (result.profile.role === "visitante") {
    redirect("/coworking/agenda");
  }
  return result;
}

export async function requireAdmin() {
  const result = await requireProfile();
  if (result.profile.role !== "admin") {
    redirect("/");
  }
  return result;
}

export async function requireAdminOrTatuador() {
  const result = await requireProfile();
  if (result.profile.role !== "admin" && result.profile.role !== "tatuador") {
    redirect("/");
  }
  return result;
}

export async function requireAdminOrChefePiercing() {
  const result = await requireProfile();
  if (result.profile.role !== "admin" && result.profile.role !== "chefe_piercing") {
    redirect("/");
  }
  return result;
}

// Chefe de Piercing não tem acesso à agenda/mapa/criação de agendamentos —
// só a Colaboradores (piercer), Estoque (piercing) e Relatórios. Chame isto
// no topo de qualquer tela de agenda para mandá-lo pro lugar certo.
export async function blockChefePiercing(
  profile: Pick<Profile, "role">,
  redirectTo = "/colaboradores"
) {
  if (profile.role === "chefe_piercing") {
    redirect(redirectTo);
  }
}
