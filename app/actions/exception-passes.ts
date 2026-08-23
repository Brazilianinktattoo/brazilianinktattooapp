"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type CreateExceptionPassState = {
  error?: string;
  success?: boolean;
};

const DURATION_HOURS: Record<string, number> = {
  "1": 1,
  "2": 2,
  "4": 4,
};

function endOfDayStudio(): Date {
  const now = new Date();
  const localNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const end = new Date(localNow);
  end.setHours(23, 59, 59, 999);
  const diffMs = end.getTime() - localNow.getTime();
  return new Date(now.getTime() + diffMs);
}

export async function createExceptionPass(
  _prevState: CreateExceptionPassState,
  formData: FormData
): Promise<CreateExceptionPassState> {
  const { user } = await requireAdmin();

  const collaboratorId = String(formData.get("collaborator_id") ?? "");
  const duration = String(formData.get("duration") ?? "");

  if (!collaboratorId) {
    return { error: "Selecione um colaborador." };
  }

  const startsAt = new Date();
  const endsAt =
    duration === "resto_do_dia" ? endOfDayStudio() : new Date(startsAt.getTime() + (DURATION_HOURS[duration] ?? 2) * 60 * 60 * 1000);

  if (duration !== "resto_do_dia" && !DURATION_HOURS[duration]) {
    return { error: "Selecione a duração da liberação." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("collaborator_exception_passes").insert({
    collaborator_id: collaboratorId,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    created_by: user.id,
  });

  if (error) {
    return { error: "Não foi possível criar a liberação." };
  }

  revalidatePath("/liberacoes");
  return { success: true };
}

export async function revokeExceptionPass(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("collaborator_exception_passes").delete().eq("id", id);
  revalidatePath("/liberacoes");
}
