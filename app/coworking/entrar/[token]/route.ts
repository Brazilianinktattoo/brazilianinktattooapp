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

  const now = Date.now();
  if (now < new Date(pass.starts_at).getTime()) {
    return redirectTo("/coworking/entrar/erro", "?motivo=ainda-nao");
  }
  if (now > new Date(pass.ends_at).getTime()) {
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
