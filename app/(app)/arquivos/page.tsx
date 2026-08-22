import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { DocumentFile, DocumentFolder } from "@/lib/types/database";
import { NewFolderForm } from "./new-folder-form";
import { FolderRow } from "./folder-row";
import { UploadFileForm } from "./upload-file-form";
import { FileRow } from "./file-row";

export default async function ArquivosPage(props: PageProps<"/arquivos">) {
  const searchParams = await props.searchParams;
  await requireAdmin();

  const folderId =
    typeof searchParams.folderId === "string" ? searchParams.folderId : null;

  const supabase = await createClient();

  // Trilha de migalhas de pão — sobe pela cadeia de parent_id até a raiz.
  const trail: DocumentFolder[] = [];
  let cursorId = folderId;
  let guard = 0;
  while (cursorId && guard < 20) {
    const { data: folder } = await supabase
      .from("document_folders")
      .select("*")
      .eq("id", cursorId)
      .maybeSingle<DocumentFolder>();
    if (!folder) break;
    trail.unshift(folder);
    cursorId = folder.parent_id;
    guard++;
  }

  const [{ data: subfolders }, { data: files }] = await Promise.all([
    folderId
      ? supabase
          .from("document_folders")
          .select("*")
          .eq("parent_id", folderId)
          .order("name")
          .returns<DocumentFolder[]>()
      : supabase
          .from("document_folders")
          .select("*")
          .is("parent_id", null)
          .order("name")
          .returns<DocumentFolder[]>(),
    folderId
      ? supabase
          .from("document_files")
          .select("*")
          .eq("folder_id", folderId)
          .order("name")
          .returns<DocumentFile[]>()
      : Promise.resolve({ data: [] as DocumentFile[] }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Arquivos</h1>
        <p className="text-neutral-400">
          Documentos digitalizados/arquivados — acesso exclusivo dos
          administradores.
        </p>
      </div>

      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-neutral-400">
        <Link href="/arquivos" className="hover:text-gold">
          Raiz
        </Link>
        {trail.map((folder) => (
          <span key={folder.id} className="flex items-center gap-1.5">
            <span>/</span>
            <Link href={`/arquivos?folderId=${folder.id}`} className="hover:text-gold">
              {folder.name}
            </Link>
          </span>
        ))}
      </nav>

      <NewFolderForm parentId={folderId} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(subfolders ?? []).map((folder) => (
          <FolderRow key={folder.id} folder={folder} />
        ))}
        {(subfolders ?? []).length === 0 && (
          <p className="text-sm text-neutral-500">
            Nenhuma subpasta aqui ainda.
          </p>
        )}
      </div>

      {folderId && (
        <>
          <UploadFileForm folderId={folderId} />

          <div className="overflow-x-auto rounded-xl border border-neutral-800">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-gold-soft/20 text-neutral-500">
                  <th className="py-3 pl-4 pr-4 font-medium">Nome</th>
                  <th className="py-3 pr-4 font-medium">Tamanho</th>
                  <th className="py-3 pr-4 font-medium">Enviado em</th>
                  <th className="py-3 pr-4 font-medium" />
                </tr>
              </thead>
              <tbody>
                {(files ?? []).map((file) => (
                  <FileRow key={file.id} file={file} />
                ))}
              </tbody>
            </table>
            {(files ?? []).length === 0 && (
              <p className="p-6 text-center text-neutral-500">
                Nenhum arquivo nessa pasta ainda.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
