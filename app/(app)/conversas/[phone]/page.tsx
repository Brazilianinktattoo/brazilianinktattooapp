import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { REPLY_WINDOW_MS } from "@/lib/whatsapp/inbox";
import { AutoRefresh } from "../auto-refresh";
import { formatPhone } from "../page";
import { MediaView } from "./media-link";
import { ContactActions } from "./contact-actions";
import { ReplyForm } from "./reply-form";

type Msg = {
  id: string;
  direction: "in" | "out";
  type: string;
  body: string | null;
  media_path: string | null;
  mime_type: string | null;
  status: string | null;
  error: string | null;
  created_at: string;
};

const TICKS: Record<string, string> = { sent: "✓", delivered: "✓✓", read: "✓✓", failed: "⚠" };

export default async function ConversaPage(props: PageProps<"/conversas/[phone]">) {
  const { phone } = await props.params;
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: conv }, { data: msgs }] = await Promise.all([
    supabase.from("whatsapp_conversations").select("*").eq("phone", phone).maybeSingle(),
    supabase
      .from("whatsapp_messages")
      .select("id, direction, type, body, media_path, mime_type, status, error, created_at")
      .eq("phone", phone)
      .order("created_at")
      .limit(500)
      .returns<Msg[]>(),
  ]);
  if (!conv) notFound();

  const canReply =
    !!conv.last_inbound_at && Date.now() - new Date(conv.last_inbound_at).getTime() <= REPLY_WINDOW_MS;

  return (
    <div className="flex flex-col gap-4">
      <AutoRefresh seconds={5} />
      <div>
        <Link href="/conversas" className="text-sm text-neutral-500 hover:text-white">
          ← Conversas
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-white">{conv.display_name || formatPhone(phone)}</h1>
        <p className="text-sm text-neutral-500">{formatPhone(phone)}</p>
        <div className="mt-2">
          <ContactActions phone={phone} ignored={conv.ignored} blocked={conv.blocked} />
        </div>
      </div>

      <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
        {(msgs ?? []).map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
              m.direction === "out"
                ? "self-end bg-gold/20 text-neutral-100"
                : "self-start bg-neutral-800 text-neutral-100"
            }`}
          >
            {m.media_path && <MediaView path={m.media_path} type={m.type} mime={m.mime_type} />}
            {!m.media_path && m.type !== "text" && m.type !== "template" && !m.body && (
              <span className="text-neutral-500">[{m.type} não disponível]</span>
            )}
            {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
            <p className="mt-1 text-right text-[10px] text-neutral-500">
              {m.type === "template" && "automática · "}
              {new Date(m.created_at).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "America/Sao_Paulo",
              })}
              {m.direction === "out" && m.status && (
                <span className={m.status === "read" ? " text-sky-400" : m.status === "failed" ? " text-red-400" : ""}>
                  {" "}
                  {TICKS[m.status] ?? ""}
                </span>
              )}
            </p>
            {m.error && <p className="text-xs text-red-400">{m.error}</p>}
          </div>
        ))}
      </div>

      <ReplyForm phone={phone} canReply={canReply} />
    </div>
  );
}
