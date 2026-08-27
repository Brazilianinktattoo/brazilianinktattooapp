import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Maca, Unit } from "@/lib/types/database";
import { OpenComandaForm } from "./open-comanda-form";

export default async function AbrirComandaPage(
  props: PageProps<"/comandas/abrir">
) {
  const searchParams = await props.searchParams;
  const { user, profile } = await requireProfile();
  const isAdmin = profile.role === "admin";

  const client_name =
    typeof searchParams.client_name === "string" ? searchParams.client_name : "";
  const client_phone =
    typeof searchParams.client_phone === "string" ? searchParams.client_phone : "";
  const collaborator_id =
    typeof searchParams.collaborator_id === "string"
      ? searchParams.collaborator_id
      : user.id;

  const supabase = await createClient();

  const [{ data: units }, { data: macas }, { data: collaborator }, { data: anamnese }, { data: allCollaborators }] =
    await Promise.all([
      supabase.from("units").select("*").eq("active", true).order("name").returns<Unit[]>(),
      supabase.from("macas").select("*").eq("active", true).order("label").returns<Maca[]>(),
      supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", collaborator_id)
        .maybeSingle(),
      client_phone
        ? supabase
            .from("anamnese_forms")
            .select("id, deposit_amount")
            .eq("phone", client_phone)
            .not("signed_at", "is", null)
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      isAdmin
        ? supabase
            .from("profiles")
            .select("id, full_name, role")
            .in("role", ["admin", "tatuador", "piercer", "chefe_piercing"])
            .eq("active", true)
            .order("full_name")
        : Promise.resolve({ data: null }),
    ]);

  const needsMaca = collaborator?.role === "tatuador" || collaborator?.role === "admin";
  // Chefe de Piercing e Body Piercer só precisam da ficha quando o
  // atendimento envolve perfuração — venda avulsa de jóia ou outro serviço
  // não exige (ver toggle "Envolve perfuração?" no formulário e a checagem
  // correspondente em openComandaFromClient).
  const isPiercingRole =
    collaborator?.role === "piercer" || collaborator?.role === "chefe_piercing";

  if (!client_name || !client_phone) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold text-white">Abrir comanda</h1>
        <div className="rounded-xl border border-amber-800 bg-amber-500/10 p-6 text-center text-amber-300">
          Cliente não identificado — abra a comanda a partir de uma ficha ou
          do cadastro do cliente.
        </div>
      </div>
    );
  }

  if (!anamnese && !isPiercingRole && !isAdmin) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold text-white">Abrir comanda</h1>
        <div className="rounded-xl border border-amber-800 bg-amber-500/10 p-6 text-center text-amber-300">
          <p className="font-medium">
            {client_name} ainda não tem ficha de anamnese preenchida.
          </p>
          <p className="mt-1 text-sm text-amber-300/80">
            Gere e envie a ficha antes de abrir a comanda — é o único
            requisito.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/comandas" className="text-sm text-neutral-500 hover:text-white">
          ← Comanda
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-white">Abrir comanda</h1>
        <p className="text-neutral-400">
          {client_name} · {client_phone}
          {anamnese ? " — ficha de anamnese já preenchida." : ""}
        </p>
        {anamnese?.deposit_amount ? (
          <p className="mt-1 text-sm text-green-400">
            Sinal já pago:{" "}
            {anamnese.deposit_amount.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </p>
        ) : null}
      </div>

      <OpenComandaForm
        clientName={client_name}
        clientPhone={client_phone}
        collaboratorId={collaborator_id}
        collaboratorName={collaborator?.full_name || "Sem nome"}
        collaborators={allCollaborators ?? []}
        units={units ?? []}
        macas={macas ?? []}
        needsMaca={needsMaca}
        isPiercingRole={isPiercingRole}
        hasAnamnese={!!anamnese}
      />
    </div>
  );
}
