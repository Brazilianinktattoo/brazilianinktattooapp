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
  return result;
}

export async function requireAdmin() {
  const result = await requireProfile();
  if (result.profile.role !== "admin") {
    redirect("/");
  }
  return result;
}
