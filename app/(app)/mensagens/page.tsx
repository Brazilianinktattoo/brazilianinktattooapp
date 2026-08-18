import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type {
  MessageQueueItemWithClient,
  MessageTemplate,
  Unit,
} from "@/lib/types/database";
import { TemplateEditor } from "./template-editor";
import { QueueRow } from "./queue-row";
import { PromoComposer } from "./promo-composer";
import { GenerateNowButton } from "./generate-now-button";
import { DispatchPanel } from "./dispatch-panel";

const TRIGGER_ORDER = [
  "aniversario",
  "pos_tattoo_1",
  "pos_tattoo_7",
  "pos_tattoo_15",
  "pos_tattoo_30",
  "pos_tattoo_60",
];

export default async function MensagensPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: templates }, { data: queue }, { data: units }] = await Promise.all([
    supabase.from("message_templates").select("*").returns<MessageTemplate[]>(),
    supabase
      .from("message_queue")
      .select("*, client:clients(id, full_name, phone)")
      .in("status", ["pendente", "erro"])
      .order("created_at", { ascending: false })
      .returns<MessageQueueItemWithClient[]>(),
    supabase.from("units").select("*").order("name").returns<Unit[]>(),
  ]);

  const sortedTemplates = [...(templates ?? [])].sort(
    (a, b) => TRIGGER_ORDER.indexOf(a.trigger) - TRIGGER_ORDER.indexOf(b.trigger)
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Mensagens</h1>
        <p className="text-neutral-400">
          Envio automático via WhatsApp (WAME API) em lotes, com proteção
          contra bloqueio. Se a WAME ainda não estiver configurada, os envios
          ficam marcados como erro na fila — o texto e o telefone continuam
          prontos pra mandar manualmente.
        </p>
      </div>

      <DispatchPanel pendingCount={(queue ?? []).length} />

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Mensagens automáticas</h2>
          <GenerateNowButton />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {sortedTemplates.map((t) => (
            <TemplateEditor key={t.id} template={t} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="font-semibold text-white">Promoções e avisos</h2>
        <PromoComposer units={units ?? []} />
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="font-semibold text-white">
          Fila de envio ({(queue ?? []).length} pendente
          {(queue ?? []).length === 1 ? "" : "s"}/com erro)
        </h2>
        <div className="flex flex-col gap-2">
          {(queue ?? []).map((item) => (
            <QueueRow key={item.id} item={item} />
          ))}
          {(queue ?? []).length === 0 && (
            <p className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 text-center text-neutral-500">
              Nenhuma mensagem pendente.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
