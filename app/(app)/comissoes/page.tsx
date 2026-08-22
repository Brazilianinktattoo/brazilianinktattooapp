import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";
import { ComissaoRow } from "./comissao-row";

export default async function ComissoesPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("role", ["tatuador", "piercer", "chefe_piercing", "admin"])
    .order("full_name")
    .returns<Profile[]>();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Comissões</h1>
        <p className="text-neutral-400">
          Defina uma taxa fixa de comissão por colaborador. Deixe em branco
          pra usar a regra automática. Chefe de Piercing e Body Piercer têm
          comissão sobre serviço (perfuração) e sobre venda de jóia
          separadas.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-gold-soft/20 text-neutral-500">
              <th className="py-3 pl-4 pr-4 font-medium">Colaborador</th>
              <th className="py-3 pr-4 font-medium">Acesso</th>
              <th className="py-3 pr-4 font-medium">Comissão sobre serviço</th>
              <th className="py-3 pr-4 font-medium">Comissão sobre venda (jóia)</th>
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((p) => (
              <ComissaoRow key={p.id} profile={p} />
            ))}
          </tbody>
        </table>
        {(profiles ?? []).length === 0 && (
          <p className="p-6 text-center text-neutral-500">
            Nenhum colaborador cadastrado ainda.
          </p>
        )}
      </div>
    </div>
  );
}
