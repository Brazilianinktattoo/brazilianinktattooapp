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
import { recordingToWhatsAppFile } from "@/lib/audio-encode";

export function ReplyForm({ phone, canReply }: { phone: string; canReply: boolean }) {
  const [state, action, pending] = useActionState(sendConversationReply.bind(null, phone), {} as ReplyState);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  async function sendFiles() {
    if (files.length === 0) return;
    setSending(true);
    setMediaError(null);
    const caption = (formRef.current?.elements.namedItem("text") as HTMLTextAreaElement | null)?.value ?? "";
    const pending = [...files];
    try {
      for (let i = 0; i < pending.length; i++) {
        const f = pending[i];
        const up = await createConversationUpload(phone, f.name, f.type, f.size);
        if ("error" in up && up.error) throw new Error(`${f.name}: ${up.error}`);
        const { error } = await createClient()
          .storage.from("documentos")
          .uploadToSignedUrl(up.path!, up.token!, f, { contentType: f.type });
        if (error) throw new Error(`${f.name}: falha ao subir o arquivo.`);
        const r = await sendConversationMedia(phone, up.path!, f.type, f.name, i === 0 ? caption : "");
        if (r.error) throw new Error(`${f.name}: ${r.error}`);
        setFiles((cur) => cur.filter((x) => x !== f));
      }
      if (fileRef.current) fileRef.current.value = "";
      formRef.current?.reset();
    } catch (e) {
      setMediaError(e instanceof Error ? e.message : "Não foi possível enviar o arquivo.");
    } finally {
      setSending(false);
    }
  }

  function addFiles(list: FileList | File[] | null) {
    if (!list) return;
    setFiles((cur) => [...cur, ...Array.from(list)]);
  }

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    setMediaError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        setRecording(false);
        try {
          const file = await recordingToWhatsAppFile(new Blob(chunksRef.current, { type: rec.mimeType }));
          setFiles((cur) => [...cur, file]);
        } catch {
          setMediaError("Não consegui preparar o áudio gravado.");
        }
      };
      rec.start();
      recorderRef.current = rec;
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((n) => n + 1), 1000);
      setRecording(true);
    } catch {
      setMediaError("Não consegui acessar o microfone — libere a permissão no navegador.");
    }
  }

  return (
    <form
      ref={formRef}
      action={files.length > 0 ? undefined : action}
      onSubmit={(e) => {
        if (files.length > 0) {
          e.preventDefault();
          sendFiles();
        }
      }}
      className="flex flex-col gap-2"
    >
      {files.map((f, i) => (
        <div
          key={`${f.name}-${i}`}
          className="flex items-center justify-between gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-300"
        >
          <span className="truncate">
            {f.type.startsWith("audio/") ? "🎤" : "📎"} {f.name}
          </span>
          <button
            type="button"
            onClick={() => setFiles((cur) => cur.filter((x) => x !== f))}
            className="text-neutral-500 hover:text-white"
          >
            Remover
          </button>
        </div>
      ))}
      <div className="flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          accept="image/jpeg,image/png,video/mp4,video/3gpp,audio/aac,audio/mp4,audio/mpeg,audio/amr,audio/ogg,application/pdf,text/plain,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label="Anexar foto, vídeo ou documento"
          className="rounded-lg border border-neutral-700 px-3 py-2 text-lg text-neutral-300 hover:border-gold-soft hover:text-gold"
        >
          📎
        </button>
        <button
          type="button"
          onClick={toggleRecording}
          aria-label={recording ? "Parar gravação" : "Gravar áudio"}
          className={`rounded-lg border px-3 py-2 text-lg ${
            recording
              ? "border-red-500 text-red-400"
              : "border-neutral-700 text-neutral-300 hover:border-gold-soft hover:text-gold"
          }`}
        >
          {recording ? `⏹ ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : "🎤"}
        </button>
        <textarea
          name="text"
          rows={2}
          required={files.length === 0}
          onPaste={(e) => {
            const pasted = Array.from(e.clipboardData.files);
            if (pasted.length > 0) {
              e.preventDefault();
              addFiles(pasted);
            }
          }}
          placeholder={files.length > 0 ? "Legenda (opcional)..." : "Escreva sua resposta..."}
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
        Anexe vários arquivos de uma vez, cole uma imagem (Ctrl/Cmd+V) ou grave um áudio. Fotos JPG/PNG até
        5MB · vídeos MP4 até 16MB · PDF, Word e Excel até 100MB.
      </p>
      {(state.error || mediaError) && <p className="text-sm text-red-400">{mediaError ?? state.error}</p>}
    </form>
  );
}
