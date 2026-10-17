"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Atualiza a tela sozinha pra novas mensagens aparecerem sem recarregar.
export function AutoRefresh({ seconds = 6 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
