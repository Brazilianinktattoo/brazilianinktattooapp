"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function updateFormText(key: string, body: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("form_texts").update({ body }).eq("key", key);
  revalidatePath("/fichas");
}
