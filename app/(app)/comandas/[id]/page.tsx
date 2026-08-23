import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { commissionRate, resolveClientIsOwn, salesCommissionRate } from "@/lib/commission";
import type {
  ComandaProductWithRelations,
  ComandaService,
  ComandaWithRelations,
  Product,
  Service,
} from "@/lib/types/database";
import { ComandaServices } from "./comanda-services";
import { ComandaProducts } from "./comanda-products";
import { ComandaJewelry } from "./comanda-jewelry";
import { CloseComandaForm } from "./close-comanda-form";
import { DeleteComandaButton } from "./delete-comanda-button";
import { CommissionRow } from "./commission-row";
import { PAYMENT_METHOD_LABEL } from "@/lib/fees";
import type { ComandaJewelry as ComandaJewelryRow, JewelryCatalogItem } from "@/lib/types/database";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  tatuador: "Tatuador(a)",
  piercer: "Body Piercer",
  chefe_piercing: "Chefe de Piercing",
  visitante: "Visitante",
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
      "*, appointment:appointments(id, client_name, starts_at, client_is_own, deposit_amount, deposit_status), collaborator:profiles!comandas_collaborator_id_fkey(id, full_name, role, commission_rate, commission_rate_sales), unit:units(id, name)"
    )
    .eq("id", id)
    .maybeSingle<ComandaWithRelations>();

  if (!comanda) notFound();

  const isPiercingComanda =
    comanda.collaborator?.role === "piercer" ||
    comanda.collaborator?.role === "chefe_piercing";

  // Chefe de Piercing edita qualquer comanda de piercing (não só as
  // próprias) — coerente com o acesso total que já tem sobre essa parte.
  const canEdit =
    (comanda.collaborator_id === user.id ||
      profile.role === "admin" ||
      (profile.role === "chefe_piercing" && isPiercingComanda)) &&
    comanda.status === "aberta";

  // Chefe de Piercing também atua como body piercer (mesma regra usada nos
  // relatórios/comissão) — sem isso, o catálogo de serviços certo (piercing)
  // nunca aparecia pra ele adicionar na própria comanda.
  const serviceCategory = isPiercingComanda ? "piercing" : "tatuagem";

  const [
    { data: services },
    { data: productLines },
    { data: products },
    { data: jewelryLines },
    { data: jewelryCatalog },
    { data: serviceCatalog },
    { data: anamnese },
  ] = await Promise.all([
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
    supabase
      .from("comanda_jewelry")
      .select("*")
      .eq("comanda_id", id)
      .order("created_at")
      .returns<ComandaJewelryRow[]>(),
    supabase
      .from("jewelry_catalog")
      .select("*")
      .eq("active", true)
      .order("name")
      .returns<JewelryCatalogItem[]>(),
    supabase
      .from("services")
      .select("*")
      .eq("active", true)
      .eq("category", serviceCategory)
      .order("name")
      .returns<Service[]>(),
    comanda.appointment_id
      ? supabase
          .from("anamnese_forms")
          .select("client_origin, signed_at")
          .eq("appointment_id", comanda.appointment_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const servicesTotal = (services ?? []).reduce((s, i) => s + i.price, 0);
  const productsTotal = (productLines ?? []).reduce(
    (s, i) => s + i.quantity * i.unit_price,
    0
  );
  const jewelryTotal = (jewelryLines ?? []).reduce((s, i) => s + i.value, 0);
  const grandTotal = servicesTotal + productsTotal + jewelryTotal;

  // Comissão sobre serviço (tatuagem/piercing) + comissão sobre venda de
  // jóia (Chefe de Piercing/Body Piercer, taxa separada — ver
  // lib/commission.ts) — mesma regra do relatório e da notificação de
  // comissão devida.
  const clientIsOwn = resolveClientIsOwn(
    comanda.appointment?.client_is_own ?? false,
    anamnese?.client_origin,
    anamnese?.signed_at
  );
  const rate = commissionRate(
    comanda.unit?.name ?? "",
    clientIsOwn,
    comanda.collaborator?.commission_rate,
    !isPiercingComanda
  );
  const salesRate = salesCommissionRate(comanda.collaborator?.commission_rate_sales);
  const computedCommission =
    Math.round(servicesTotal * rate * 100) / 100 +
    Math.round(jewelryTotal * salesRate * 100) / 100;

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
          {canEdit && <CloseComandaForm comandaId={comanda.id} />}
          {profile.role === "admin" && (
            <DeleteComandaButton
              comandaId={comanda.id}
              clientName={comanda.appointment?.client_name ?? "cliente"}
            />
          )}
        </div>
      </div>

      <ComandaServices
        comandaId={comanda.id}
        services={services ?? []}
        catalog={serviceCatalog ?? []}
        canEdit={canEdit}
      />

      <ComandaProducts
        comandaId={comanda.id}
        items={productLines ?? []}
        products={products ?? []}
        canEdit={canEdit}
      />

      <ComandaJewelry
        comandaId={comanda.id}
        items={jewelryLines ?? []}
        catalog={jewelryCatalog ?? []}
        canEdit={canEdit}
      />

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
        <div className="flex items-center justify-between text-neutral-300">
          <span>Total bruto</span>
          <span className="text-lg font-semibold text-white">
            {grandTotal.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </span>
        </div>

        {comanda.appointment?.deposit_amount ? (
          <div className="flex items-center justify-between border-t border-neutral-800 pt-2 text-sm text-neutral-300">
            <span>
              Sinal{" "}
              {comanda.appointment.deposit_status === "pago" ? "pago" : "combinado"}
            </span>
            <span className="text-green-400">
              {comanda.appointment.deposit_amount.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
        ) : null}

        <div className="mt-2 flex flex-col gap-1 border-t border-neutral-800 pt-2 text-sm text-neutral-300">
          <CommissionRow
            comandaId={comanda.id}
            computedAmount={computedCommission}
            savedAmount={comanda.commission_amount}
            canEdit={profile.role === "admin"}
          />
        </div>

        {comanda.status === "fechada" ? (
          <div className="mt-2 flex flex-col gap-1 border-t border-neutral-800 pt-2 text-sm text-neutral-300">
            <div className="flex items-center justify-between">
              <span>Forma de pagamento</span>
              <span className="text-neutral-100">
                {comanda.payment_method
                  ? PAYMENT_METHOD_LABEL[comanda.payment_method]
                  : "—"}
                {comanda.payment_method === "credito" &&
                  comanda.installments > 1 &&
                  ` (${comanda.installments}x)`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Taxa aplicada</span>
              <span className="text-neutral-100">{comanda.fee_rate_percent}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Valor cobrado do cliente</span>
              <span className="font-semibold text-green-400">
                {(comanda.charged_amount ?? 0).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-xs text-neutral-500">
            A forma de pagamento e o valor cobrado são registrados no
            fechamento.
          </p>
        )}
      </div>
    </div>
  );
}
