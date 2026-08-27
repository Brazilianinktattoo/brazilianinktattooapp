import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DeleteComandaRowButton } from "./delete-comanda-row-button";
import { NewComandaQuickForm } from "./new-comanda-quick-form";

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  tatuador: "Tatuador(a)",
  piercer: "Body Piercer",
  chefe_piercing: "Chefe de Piercing",
};

type Row = {
  id: string;
  status: "aberta" | "fechada";
  created_at: string;
  charged_amount: number | null;
  appointment: { client_name: string; starts_at: string } | null;
  collaborator: { full_name: string; role: string } | null;
  comanda_services: { description: string; price: number }[];
  comanda_products: { quantity: number; unit_price: number }[];
  comanda_jewelry: { value: number }[];
};

export default async function ComandasListPage() {
  const { user, profile } = await requireProfile();
  const isAdmin = profile.role === "admin";
  if (!isAdmin && !["tatuador", "piercer", "chefe_piercing"].includes(profile.role)) {
    redirect("/");
  }

  const supabase = await createClient();
  const isChefePiercing = profile.role === "chefe_piercing";

  // Admin tem acesso total a todas as comandas, de qualquer colaborador;
  // Chefe de Piercing vê as comandas de qualquer body piercer (a RLS já
  // permite isso — só faltava a lista não filtrar só pelas próprias); os
  // demais veem só as próprias.
  let query = supabase
    .from("comandas")
    .select(
      "id, status, created_at, charged_amount, appointment:appointments(client_name, starts_at), collaborator:profiles!comandas_collaborator_id_fkey(full_name, role), comanda_services(description, price), comanda_products(quantity, unit_price), comanda_jewelry(value)"
    )
    .order("created_at", { ascending: false });
  if (isChefePiercing) {
    query = query.in(
      "collaborator_id",
      (
        await supabase
          .from("profiles")
          .select("id")
          .in("role", ["piercer", "chefe_piercing"])
      ).data?.map((p) => p.id) ?? []
    );
  } else if (!isAdmin) {
    query = query.eq("collaborator_id", user.id);
  }

  const { data: comandas } = await query.returns<Row[]>();

  const list = comandas ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Comanda</h1>
        <p className="text-neutral-400">
          {isAdmin
            ? "Todas as comandas do estúdio, mais recentes primeiro."
            : isChefePiercing
              ? "Comandas de todos os body piercers, mais recentes primeiro."
              : "Suas comandas, mais recentes primeiro."}{" "}
          🟢 fechada (pagamento preenchido) · 🔴 aberta (aguardando
          fechamento).
        </p>
      </div>

      {isAdmin && <NewComandaQuickForm />}

      <div className="flex flex-col gap-2">
        {list.map((c) => {
          const servicesTotal = c.comanda_services.reduce((s, i) => s + i.price, 0);
          const productsTotal = c.comanda_products.reduce(
            (s, i) => s + i.quantity * i.unit_price,
            0
          );
          const jewelryTotal = c.comanda_jewelry.reduce((s, i) => s + i.value, 0);
          const total =
            c.status === "fechada"
              ? c.charged_amount ?? servicesTotal + productsTotal + jewelryTotal
              : servicesTotal + productsTotal + jewelryTotal;

          const serviceLabel =
            c.comanda_services.length === 0
              ? "—"
              : c.comanda_services.length === 1
                ? c.comanda_services[0].description
                : `${c.comanda_services[0].description} +${c.comanda_services.length - 1}`;

          const isPiercingComanda =
            c.collaborator?.role === "piercer" || c.collaborator?.role === "chefe_piercing";
          const canDelete = isAdmin || (isChefePiercing && isPiercingComanda);

          return (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 transition hover:border-gold-soft"
            >
              <Link
                href={`/comandas/${c.id}`}
                className="flex flex-1 items-center gap-3"
              >
                <span aria-hidden className="text-lg leading-none">
                  {c.status === "fechada" ? "🟢" : "🔴"}
                </span>
                <div>
                  <div className="text-neutral-100">
                    {c.appointment?.client_name ?? "—"}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {c.appointment
                      ? new Date(c.appointment.starts_at).toLocaleDateString("pt-BR")
                      : "—"}{" "}
                    · {serviceLabel}
                    {(isAdmin || isChefePiercing) && c.collaborator && (
                      <>
                        {" "}
                        · {c.collaborator.full_name || "Sem nome"} (
                        {ROLE_LABEL[c.collaborator.role] ?? c.collaborator.role})
                      </>
                    )}
                  </div>
                </div>
              </Link>
              <Link href={`/comandas/${c.id}`} className="flex items-center gap-3">
                <span className="font-medium text-white">{money(total)}</span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    c.status === "fechada"
                      ? "bg-green-500/15 text-green-400"
                      : "bg-red-500/15 text-red-400"
                  }`}
                >
                  {c.status === "fechada" ? "Fechada" : "Aberta"}
                </span>
              </Link>
              {canDelete && (
                <DeleteComandaRowButton
                  comandaId={c.id}
                  clientName={c.appointment?.client_name ?? "cliente"}
                />
              )}
            </div>
          );
        })}
        {list.length === 0 && (
          <p className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 text-center text-neutral-500">
            Nenhuma comanda ainda.
          </p>
        )}
      </div>
    </div>
  );
}
