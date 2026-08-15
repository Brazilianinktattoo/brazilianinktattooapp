"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationRead(id: string) {
  const { user } = await requireProfile();
  const supabase = await createClient();
  // RLS already scopes this to the caller's own notifications.
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id)
    .eq("profile_id", user.id);
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead() {
  const { user } = await requireProfile();
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("profile_id", user.id)
    .eq("read", false);
  revalidatePath("/", "layout");
}
