import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase auth session on every navigation and gates
// unauthenticated access to the app. Called from the root proxy.ts.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // IMPORTANT: getUser() revalidates the token against Supabase Auth.
  // Do not swap for getSession() here — that only reads the (possibly
  // stale) cookie and would let an expired session through.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginRoute = request.nextUrl.pathname.startsWith("/login");
  // Entrada do visitante de coworking: sem sessão ainda, o link/token é a
  // credencial — a própria rota autentica automaticamente em seguida.
  const isCoworkingEntry = request.nextUrl.pathname.startsWith(
    "/coworking/entrar/"
  );
  // Ficha de inscrição de curso: o lead preenche o formulário sem nunca
  // logar — não tem sessão nenhuma, só o token do link.
  const isCourseSignup = request.nextUrl.pathname.startsWith(
    "/cursos/inscricao/"
  );
  // Assinatura de contrato de curso: idem — o aluno acessa só pelo token do
  // link, sem sessão.
  const isCourseContract = request.nextUrl.pathname.startsWith(
    "/cursos/contrato/"
  );

  if (
    !user &&
    !isLoginRoute &&
    !isCoworkingEntry &&
    !isCourseSignup &&
    !isCourseContract
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}
