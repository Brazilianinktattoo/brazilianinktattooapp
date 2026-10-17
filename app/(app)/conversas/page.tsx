import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AutoRefresh } from "./auto-refresh";

type Conv = {
  phone: string;
  display_name: string | null;
  last_message_at: string;
  last_inbound_at: string | null;
  last_preview: string | null;
  unread_count: number;
};

function when(iso: string) {
  const d = new Date(iso);
  const today = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const day = d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  return day === today
    ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
}

export function formatPhone(p: string) {
  const d = p.replace(/\D/g, "");
  if (d.startsWith("55") && d.length === 13) return `(${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  return `+${d}`;
}

export default async function ConversasPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("whatsapp_conversations")
    .select("*")
    .not("last_inbound_at", "is", null)
    .order("last_message_at", { ascending: false })
    .limit(200)
    .returns<Conv[]>();
  const list = data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <AutoRefresh />
      <div>
        <h1 className="text-xl font-semibold text-white">Conversas</h1>
        <p className="text-neutral-400">
          Respostas dos clientes no WhatsApp do estúdio. Você pode responder livremente por 24h depois
          da última mensagem do cliente.
        </p>
      </div>
      <div className="flex flex-col divide-y divide-neutral-800 overflow-hidden rounded-xl border border-neutral-800">
        {list.map((c) => (
          <Link
            key={c.phone}
            href={`/conversas/${c.phone}`}
            className="flex items-center justify-between gap-3 bg-neutral-900/40 px-4 py-3 transition hover:bg-neutral-900"
          >
            <div className="min-w-0">
              <p className={`truncate ${c.unread_count > 0 ? "font-semibold text-white" : "text-neutral-200"}`}>
                {c.display_name || formatPhone(c.phone)}
              </p>
              <p className="truncate text-sm text-neutral-500">{c.last_preview ?? ""}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-neutral-500">
              <span>{when(c.last_message_at)}</span>
              {c.unread_count > 0 && (
                <span className="rounded-full bg-gold px-2 py-0.5 font-semibold text-neutral-950">
                  {c.unread_count}
                </span>
              )}
            </div>
          </Link>
        ))}
        {list.length === 0 && (
          <p className="p-6 text-center text-neutral-500">Nenhuma resposta de cliente ainda.</p>
        )}
      </div>
    </div>
  );
}
