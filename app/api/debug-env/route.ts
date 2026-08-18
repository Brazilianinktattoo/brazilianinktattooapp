import { NextResponse } from "next/server";
import { createHash } from "crypto";

// DEBUG TEMPORÁRIO — remover depois de resolver o bug de login em produção.
// Só retorna hash SHA-256 + tamanho (nunca o valor em si, nem prefixo/sufixo
// reais) — evita acionar a redação automática de segredos da Vercel nas
// respostas de API, que mascara qualquer string parecida com um JWT.
function inspect(value: string | undefined) {
  if (value === undefined) return { present: false };
  return {
    present: true,
    length: value.length,
    sha256: createHash("sha256").update(value).digest("hex"),
  };
}

export async function GET() {
  return NextResponse.json({
    url: inspect(process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: inspect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    serviceRoleKey: inspect(process.env.SUPABASE_SERVICE_ROLE_KEY),
  });
}
