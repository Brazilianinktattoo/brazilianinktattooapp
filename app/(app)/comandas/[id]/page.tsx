import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type {
  ComandaProductWithRelations,
  ComandaService,
  ComandaWithRelations,
  Product,
} from "@/lib/types/database";
import { ComandaServices } from "./comanda-services";
import { ComandaProducts } from "./comanda-products";
import { CloseComandaButton } from "./close-comanda-button";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  tatuador: "Tatuador(a)",
  piercer: "Body Piercer",
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ComandaPage(props: PageProps<"/comandas/[id]">) {
  const { id } = await props.params;
  const { user, profile } = await requireProfile();

  const supabase = await createClient();

  const { data: comanda } = await supabase
    .from("comandas")
    .select(
      "*, appointment:appointments(id, client_name, starts_at), collaborator:profiles!comandas_collaborator_id_fkey(id, full_name, role), unit:units(id, name)"
    )
    .eq("id", id)
    .maybeSingle<ComandaWithRelations>();

  if (!comanda) notFound();

  const canEdit =
    (comanda.collaborator_id === user.id || profile.role === "admin") &&
    comanda.status === "aberta";

  const [{ data: services }, { data: productLines }, { data: products }] =
    await Promise.all([
      supabase
        .from("comanda_services")
        .select("*")
        .eq("comanda_id", id)
        .order("created_at")
        .returns<ComandaService[]>(),
      supabase
        .from("comanda_products")
        .select("*, product:products(id, name, code)")
        .eq("comanda_id", id)
        .order("created_at")
        .returns<ComandaProductWithRelations[]>(),
      supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .order("name")
        .returns<Product[]>(),
    ]);

  const servicesTotal = (services ?? []).reduce((s, i) => s + i.price, 0);
  const productsTotal = (productLines ?? []).reduce(
    (s, i) => s + i.quantity * i.unit_price,
    0
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">
            Comanda — {comanda.appointment?.client_name ?? "—"}
          </h1>
          <p className="text-neutral-400">
            {comanda.appointment && formatWhen(comanda.appointment.starts_at)}{" "}
            · {comanda.unit?.name ?? "—"} ·{" "}
            {comanda.collaborator?.full_name || "Sem nome"} (
            {ROLE_LABEL[comanda.collaborator?.role ?? ""] ?? ""})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              comanda.status === "aberta"
                ? "bg-green-500/15 text-green-400"
                : "bg-neutral-700/40 text-neutral-400"
            }`}
          >
            {comanda.status === "aberta" ? "Aberta" : "Fechada"}
          </span>
          {canEdit && <CloseComandaButton comandaId={comanda.id} />}
        </div>
      </div>

      <ComandaServices
        comandaId={comanda.id}
        services={services ?? []}
        canEdit={canEdit}
      />

      <ComandaProducts
        comandaId={comanda.id}
        items={productLines ?? []}
        products={products ?? []}
        canEdit={canEdit}
      />

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
        <div className="flex items-center justify-between text-neutral-300">
          <span>Total (referência)</span>
          <span className="text-lg font-semibold text-white">
            {(servicesTotal + productsTotal).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </span>
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          O pagamento em si é registrado na próxima fase.
        </p>
      </div>
    </div>
  );
}
