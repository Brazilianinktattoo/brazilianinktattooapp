"use client";

import { useEffect, useState } from "react";
import { getConversationMediaUrl } from "@/app/actions/conversas";

export function MediaView({ path, type, mime }: { path: string; type: string; mime: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    getConversationMediaUrl(path).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [path]);

  if (!url) return <span className="text-xs text-neutral-500">Carregando arquivo...</span>;
  if (type === "image" || type === "sticker")
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="max-h-64 rounded-lg" />;
  if (type === "video") return <video src={url} controls className="max-h-64 rounded-lg" />;
  if (type === "audio") return <audio src={url} controls />;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="text-gold underline">
      Abrir arquivo{mime ? ` (${mime.split("/")[1]})` : ""}
    </a>
  );
}
