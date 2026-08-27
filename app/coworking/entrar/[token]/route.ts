import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/server";
import type { CoworkingPass } from "@/lib/types/database";

// Entrada do visitante de coworking: o link é a credencial. Valida o token
// e o período do pass e autentica automaticamente no login sombra criado
// junto com o pass (ver app/actions/coworking.ts).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const redirectTo = (path: string, search?: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = search ?? "";
    return NextResponse.redirect(url);
  };

  const admin = createAdminClient();
  const { data: pass } = await admin
    .from("coworking_passes")
    .select("*")
    .eq("token", token)
    .maybeSingle<CoworkingPass>();

  if (!pass) return redirectTo("/coworking/entrar/erro", "?motivo=invalido");

  // Um visitante pode ter vários passes (um por dia reservado) sob o mesmo
  // acesso — o link continua valendo em qualquer um dos dias reservados,
  // não só no dia em que foi gerado. Libera se QUALQUER passe desse
  // visitante estiver ativo agora.
  const { data: allPasses } = await admin
    .from("coworking_passes")
    .select("starts_at, ends_at")
    .eq("profile_id", pass.profile_id)
    .returns<Pick<CoworkingPass, "starts_at" | "ends_at">[]>();

  const now = Date.now();
  const windows = allPasses ?? [pass];
  const activeNow = windows.some(
    (p) => now >= new Date(p.starts_at).getTime() && now <= new Date(p.ends_at).getTime()
  );

  if (!activeNow) {
    const earliestStart = Math.min(...windows.map((p) => new Date(p.starts_at).getTime()));
    // now < earliestStart: ainda não começou nenhum dia reservado. Senão,
    // já passou do último dia ou está num intervalo entre dois dias — nos
    // dois casos o acesso de agora não está liberado.
    if (now < earliestStart) {
      return redirectTo("/coworking/entrar/erro", "?motivo=ainda-nao");
    }
    return redirectTo("/coworking/entrar/erro", "?motivo=expirado");
  }

  const response = NextResponse.redirect(
    new URL("/coworking/agenda", request.url)
  );

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const { error } = await supabase.auth.signInWithPassword({
    email: pass.guest_email,
    password: pass.guest_password,
  });

  if (error) return redirectTo("/coworking/entrar/erro", "?motivo=invalido");

  return response;
}
