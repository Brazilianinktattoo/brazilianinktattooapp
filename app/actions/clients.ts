"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireClientRegistrar } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/phone";
import { parseCsv } from "@/lib/csv";
import { mapCsvRow } from "@/lib/clients-import";

export type CreateClientState = {
  error?: string;
  success?: boolean;
};

export async function createClientManually(
  _prevState: CreateClientState,
  formData: FormData
): Promise<CreateClientState> {
  const { user } = await requireClientRegistrar();
  const full_name = String(formData.get("full_name") ?? "").trim();
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const birthday = String(formData.get("birthday") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!full_name) return { error: "Informe o nome." };
  if (!phone) return { error: "Informe o telefone." };
  if (!birthday) return { error: "Informe o aniversário." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();
  if (existing) {
    return { error: "Já existe um cliente cadastrado com esse telefone." };
  }

  const { error } = await supabase.from("clients").insert({
    full_name,
    phone,
    birthday,
    address: address || null,
    email: email || null,
    notes,
    created_by: user.id,
  });
  if (error) return { error: "Não foi possível salvar o cliente." };

  revalidatePath("/clientes");
  revalidatePath("/cadastro-cliente");
  return { success: true };
}

export type ImportCsvState = {
  error?: string;
  result?: {
    created: number;
    updated: number;
    unchanged: number;
    skipped: number;
    skippedDetails: string[];
  };
};

export async function importClientsCsv(
  _prevState: ImportCsvState,
  formData: FormData
): Promise<ImportCsvState> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo CSV." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { error: "Arquivo muito grande (máx. 5MB)." };
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return { error: "O arquivo está vazio ou não pôde ser lido." };
  }

  const supabase = await createClient();
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let skipped = 0;
  const skippedDetails: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const mapped = mapCsvRow(rows[i]);
    const rowNumber = i + 2;

    if (!mapped.phone) {
      skipped++;
      skippedDetails.push(`Linha ${rowNumber}: sem telefone`);
      continue;
    }
    if (!mapped.name) {
      skipped++;
      skippedDetails.push(`Linha ${rowNumber}: sem nome (telefone ${mapped.phone})`);
      continue;
    }

    const { data: existing } = await supabase
      .from("clients")
      .select("id, full_name, birthday, notes")
      .eq("phone", mapped.phone)
      .maybeSingle();

    if (existing) {
      const patch: { full_name?: string; birthday?: string; notes?: string } = {};
      if (mapped.name && mapped.name !== existing.full_name) {
        patch.full_name = mapped.name;
      }
      if (mapped.birthday && !existing.birthday) patch.birthday = mapped.birthday;
      if (mapped.notes && !existing.notes) patch.notes = mapped.notes;

      if (Object.keys(patch).length > 0) {
        await supabase.from("clients").update(patch).eq("id", existing.id);
        updated++;
      } else {
        unchanged++;
      }
      continue;
    }

    const { error } = await supabase.from("clients").insert({
      full_name: mapped.name,
      phone: mapped.phone,
      birthday: mapped.birthday,
      notes: mapped.notes,
    });
    if (error) {
      skipped++;
      skippedDetails.push(`Linha ${rowNumber}: erro ao salvar (${mapped.phone})`);
      continue;
    }
    created++;
  }

  revalidatePath("/clientes");
  return {
    result: { created, updated, unchanged, skipped, skippedDetails: skippedDetails.slice(0, 20) },
  };
}

export async function updateClientBirthday(id: string, birthday: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase
    .from("clients")
    .update({ birthday: birthday || null })
    .eq("id", id);
  revalidatePath("/clientes");
}

export async function updateClientNotes(id: string, notes: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("clients").update({ notes }).eq("id", id);
  revalidatePath("/clientes");
}
