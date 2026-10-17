"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createConversationUpload,
  markConversationRead,
  sendConversationMedia,
  sendConversationReply,
  type ReplyState,
} from "@/app/actions/conversas";
import { createClient } from "@/lib/supabase/client";

export function ReplyForm({ phone, canReply }: { phone: string; canReply: boolean }) {
  const [state, action, pending] = useActionState(sendConversationReply.bind(null, phone), {} as ReplyState);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  useEffect(() => {
    markConversationRead(phone);
  }, [phone]);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  if (!canReply) {
    return (
      <p className="rounded-xl border border-amber-800 bg-amber-500/10 p-3 text-sm text-amber-300">
        Passaram mais de 24h desde a última mensagem do cliente. O WhatsApp só permite retomar por mensagem
        modelo aprovada — espere ele escrever de novo.
      </p>
    );
  }

  async function sendFile() {
    if (!file) return;
    setSending(true);
    setMediaError(null);
    try {
      const caption = (formRef.current?.elements.namedItem("text") as HTMLTextAreaElement | null)?.value ?? "";
      const up = await createConversationUpload(phone, file.name, file.type, file.size);
      if ("error" in up && up.error) throw new Error(up.error);
      const { error } = await createClient()
        .storage.from("documentos")
        .uploadToSignedUrl(up.path!, up.token!, file, { contentType: file.type });
      if (error) throw new Error("Falha ao subir o arquivo.");
      const r = await sendConversationMedia(phone, up.path!, file.type, file.name, caption);
      if (r.error) throw new Error(r.error);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      formRef.current?.reset();
    } catch (e) {
      setMediaError(e instanceof Error ? e.message : "Não foi possível enviar o arquivo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      ref={formRef}
      action={file ? undefined : action}
      onSubmit={(e) => {
        if (file) {
          e.preventDefault();
          sendFile();
        }
      }}
      className="flex flex-col gap-2"
    >
      {file && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-300">
          <span className="truncate">📎 {file.name}</span>
          <button
            type="button"
            onClick={() => {
              setFile(null);
              if (fileRef.current) fileRef.current.value = "";
            }}
            className="text-neutral-500 hover:text-white"
          >
            Remover
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/jpeg,image/png,video/mp4,video/3gpp,audio/aac,audio/mp4,audio/mpeg,audio/amr,audio/ogg,application/pdf,text/plain,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label="Anexar foto, vídeo ou documento"
          className="rounded-lg border border-neutral-700 px-3 py-2 text-lg text-neutral-300 hover:border-gold-soft hover:text-gold"
        >
          📎
        </button>
        <textarea
          name="text"
          rows={2}
          required={!file}
          placeholder={file ? "Legenda (opcional)..." : "Escreva sua resposta..."}
          className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
        <button
          type="submit"
          disabled={pending || sending}
          className="rounded-lg bg-gradient-to-b from-gold-strong to-gold px-4 py-2 font-medium text-neutral-950 transition hover:to-copper disabled:opacity-60"
        >
          {pending || sending ? "Enviando..." : "Enviar"}
        </button>
      </div>
      <p className="text-xs text-neutral-500">
        Fotos JPG/PNG até 5MB · vídeos MP4 até 16MB · PDF, Word e Excel até 100MB.
      </p>
      {(state.error || mediaError) && <p className="text-sm text-red-400">{mediaError ?? state.error}</p>}
    </form>
  );
}
