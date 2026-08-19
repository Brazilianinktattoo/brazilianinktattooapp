import { requireAdminOrChefePiercing } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";
import { NewCollaboratorForm } from "./new-collaborator-form";
import { CollaboratorRow } from "./collaborator-row";

export default async function ColaboradoresPage() {
  const { user, profile: viewer } = await requireAdminOrChefePiercing();
  const isChefePiercing = viewer.role === "chefe_piercing";
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  if (isChefePiercing) {
    query = query.eq("role", "piercer");
  }

  const { data: profiles } = await query.returns<Profile[]>();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Colaboradores</h1>
        <p className="text-neutral-400">
          {isChefePiercing
            ? "Crie e gerencie os logins dos body piercers."
            : "Crie logins para tatuadores, body piercers e outros admins, e defina o nível de acesso de cada um."}
        </p>
      </div>

      <NewCollaboratorForm restrictToPiercer={isChefePiercing} />

      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-gold-soft/20 text-neutral-500">
              <th className="py-3 pl-4 pr-4 font-medium">Colaborador</th>
              <th className="py-3 pr-4 font-medium">Acesso</th>
              <th className="py-3 pr-4 font-medium">Status</th>
              <th className="py-3 pr-4 font-medium">Senha</th>
              {!isChefePiercing && (
                <th className="py-3 font-medium">Ações</th>
              )}
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((profile) => (
              <CollaboratorRow
                key={profile.id}
                profile={profile}
                isSelf={profile.id === user.id}
                canChangeRole={!isChefePiercing}
              />
            ))}
          </tbody>
        </table>
        {(profiles ?? []).length === 0 && (
          <p className="p-6 text-center text-neutral-500">
            {isChefePiercing
              ? "Nenhum body piercer cadastrado ainda."
              : "Nenhum colaborador cadastrado ainda."}
          </p>
        )}
      </div>
    </div>
  );
}
