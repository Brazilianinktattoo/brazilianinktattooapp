"use server";

import { requireAdmin } from "@/lib/auth";
import { dispatchPendingBatch, type DispatchResult } from "@/lib/whatsapp/dispatch";

export async function dispatchPendingMessagesBatch(): Promise<DispatchResult> {
  await requireAdmin();
  return dispatchPendingBatch();
}
