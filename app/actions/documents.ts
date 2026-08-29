"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireAdminOrPiercingStaff } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// Reaproveita o bucket 'documentos' já existente (privado, só admin —
// supabase/020_documentos_storage.sql), com um prefixo próprio.
const BUCKET = "documentos";
const PREFIX = "arquivo";
const MAX_SIZE = 25 * 1024 * 1024;

function uniqueNameError(message: string): boolean {
  return (
    message.includes("document_folders_root_name_key") ||
    message.includes("document_folders_child_name_key")
  );
}

export type FolderFormState = {
  error?: string;
};

export async function createDocumentFolder(
  parentId: string | null,
  _prevState: FolderFormState,
  formData: FormData
): Promise<FolderFormState> {
  const { user } = await requireAdminOrPiercingStaff();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Dê um nome pra pasta." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("document_folders")
    .insert({ name, parent_id: parentId, created_by: user.id });

  if (error) {
    return {
      error: uniqueNameError(error.message)
        ? "Já existe uma pasta com esse nome aqui."
        : "Não foi possível criar a pasta.",
    };
  }

  revalidatePath("/arquivos");
  return {};
}

export async function renameDocumentFolder(id: string, name: string) {
  await requireAdminOrPiercingStaff();
  if (!name.trim()) return;
  const supabase = await createClient();
  await supabase.from("document_folders").update({ name: name.trim() }).eq("id", id);
  revalidatePath("/arquivos");
}

export type DeleteFolderResult = {
  error?: string;
  success?: boolean;
};

export async function deleteDocumentFolder(id: string): Promise<DeleteFolderResult> {
  await requireAdmin();
  const supabase = await createClient();

  const [{ count: subfolderCount }, { count: fileCount }] = await Promise.all([
    supabase
      .from("document_folders")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", id),
    supabase
      .from("document_files")
      .select("id", { count: "exact", head: true })
      .eq("folder_id", id),
  ]);

  if ((subfolderCount ?? 0) > 0 || (fileCount ?? 0) > 0) {
    return {
      error: "Essa pasta ainda tem arquivos ou subpastas — exclua o conteúdo primeiro.",
    };
  }

  const { error } = await supabase.from("document_folders").delete().eq("id", id);
  if (error) return { error: "Não foi possível excluir a pasta." };

  revalidatePath("/arquivos");
  return { success: true };
}

export type UploadFileState = {
  error?: string;
};

export async function uploadDocumentFile(
  folderId: string,
  _prevState: UploadFileState,
  formData: FormData
): Promise<UploadFileState> {
  const { user } = await requireAdminOrPiercingStaff();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo." };
  }
  if (file.size > MAX_SIZE) {
    return { error: "Arquivo muito grande (máx. 25MB)." };
  }

  const displayName = String(formData.get("name") ?? "").trim() || file.name;
  const storagePath = `${PREFIX}/${folderId}/${crypto.randomUUID()}-${file.name}`;

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type || undefined });
  if (uploadError) return { error: "Não foi possível enviar o arquivo." };

  const supabase = await createClient();
  const { error } = await supabase.from("document_files").insert({
    folder_id: folderId,
    name: displayName,
    storage_path: storagePath,
    mime_type: file.type || null,
    size_bytes: file.size,
    uploaded_by: user.id,
  });

  if (error) {
    await admin.storage.from(BUCKET).remove([storagePath]);
    return { error: "Não foi possível salvar o arquivo." };
  }

  revalidatePath("/arquivos");
  return {};
}

export async function replaceDocumentFile(
  id: string,
  _prevState: UploadFileState,
  formData: FormData
): Promise<UploadFileState> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo." };
  }
  if (file.size > MAX_SIZE) {
    return { error: "Arquivo muito grande (máx. 25MB)." };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("document_files")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return { error: "Arquivo não encontrado." };

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(existing.storage_path, file, { contentType: file.type || undefined, upsert: true });
  if (uploadError) return { error: "Não foi possível trocar o arquivo." };

  await supabase
    .from("document_files")
    .update({ mime_type: file.type || null, size_bytes: file.size })
    .eq("id", id);

  revalidatePath("/arquivos");
  return {};
}

export async function renameDocumentFile(id: string, name: string) {
  await requireAdminOrPiercingStaff();
  if (!name.trim()) return;
  const supabase = await createClient();
  await supabase.from("document_files").update({ name: name.trim() }).eq("id", id);
  revalidatePath("/arquivos");
}

export async function deleteDocumentFile(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("document_files")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return;

  const admin = createAdminClient();
  await admin.storage.from(BUCKET).remove([existing.storage_path]);
  await supabase.from("document_files").delete().eq("id", id);
  revalidatePath("/arquivos");
}

export async function getDocumentFileUrl(id: string): Promise<string | null> {
  await requireAdminOrPiercingStaff();
  const supabase = await createClient();
  const { data: file } = await supabase
    .from("document_files")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!file) return null;

  const admin = createAdminClient();
  const { data } = await admin.storage.from(BUCKET).createSignedUrl(file.storage_path, 60 * 10);
  return data?.signedUrl ?? null;
}
