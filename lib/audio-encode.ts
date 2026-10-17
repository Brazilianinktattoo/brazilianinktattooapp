import { Mp3Encoder } from "@breezystack/lamejs";

// O WhatsApp só aceita áudio AAC/MP4, MP3, AMR ou OGG-Opus. Safari grava
// audio/mp4 (ok); Chrome/Android grava webm, que a Meta recusa — então
// converte pra MP3 no próprio navegador.
export async function recordingToWhatsAppFile(blob: Blob): Promise<File> {
  const base = blob.type.split(";")[0];
  if (base === "audio/mp4") return new File([blob], "audio.m4a", { type: "audio/mp4" });
  if (base === "audio/ogg") return new File([blob], "audio.ogg", { type: "audio/ogg" });
  if (base === "audio/mpeg") return new File([blob], "audio.mp3", { type: "audio/mpeg" });

  const ctx = new AudioContext();
  const audio = await ctx.decodeAudioData(await blob.arrayBuffer());
  await ctx.close();
  const pcm = audio.getChannelData(0);
  const samples = new Int16Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) {
    const v = Math.max(-1, Math.min(1, pcm[i]));
    samples[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  const encoder = new Mp3Encoder(1, audio.sampleRate, 64);
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < samples.length; i += 1152) {
    const out = encoder.encodeBuffer(samples.subarray(i, i + 1152));
    if (out.length) chunks.push(out);
  }
  const tail = encoder.flush();
  if (tail.length) chunks.push(tail);
  return new File(chunks as BlobPart[], "audio.mp3", { type: "audio/mpeg" });
}
