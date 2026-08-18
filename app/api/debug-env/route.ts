import { NextResponse } from "next/server";

// DEBUG TEMPORÁRIO — remover depois de resolver o bug de login em produção.
// Não expõe os valores reais, só metadados (tamanho, prefixo/sufixo curtos,
// e posição de qualquer caractere fora do intervalo ASCII/Latin-1).
function inspect(value: string | undefined) {
  if (value === undefined) return { present: false };
  const badChars: { index: number; code: number; char: string }[] = [];
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code > 255) {
      badChars.push({ index: i, code, char: value[i] });
    }
  }
  return {
    present: true,
    length: value.length,
    prefix: value.slice(0, 12),
    suffix: value.slice(-12),
    badChars,
  };
}

export async function GET() {
  return NextResponse.json({
    url: inspect(process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: inspect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    serviceRoleKey: inspect(process.env.SUPABASE_SERVICE_ROLE_KEY),
  });
}
