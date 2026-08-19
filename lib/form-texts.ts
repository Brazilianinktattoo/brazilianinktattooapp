import { createAdminClient } from "@/lib/supabase/server";

// Busca um texto fixo editável (parágrafo de consentimento etc.) — usado
// nas páginas públicas de assinatura, que já usam o client admin pra ler o
// próprio formulário. Cai no texto padrão se a linha não existir/estiver
// vazia, então nunca quebra se a migração ainda não rodou.
export async function getFormText(key: string, fallback: string): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("form_texts")
    .select("body")
    .eq("key", key)
    .maybeSingle();
  return data?.body || fallback;
}
