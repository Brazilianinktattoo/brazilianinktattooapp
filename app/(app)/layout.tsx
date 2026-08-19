import Link from "next/link";
import Image from "next/image";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/actions/auth";
import { NotificationBell } from "./notification-bell";
import type { Notification } from "@/lib/types/database";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  tatuador: "Tatuador(a)",
  piercer: "Body Piercer",
  chefe_piercing: "Chefe de Piercing",
  visitante: "Visitante",
};

// Aro dourado discreto pra marcar os links como navegação, sem competir
// com o preenchimento sólido dos botões de ação (ex.: "+ Novo agendamento").
const NAV_LINK_CLASS =
  "rounded-full border-2 border-gold-soft/40 px-3 py-1 transition-colors hover:border-gold hover:text-gold";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await requireProfile();

  const supabase = await createClient();
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<Notification[]>();

  return (
    <div className="relative min-h-dvh bg-neutral-950 text-neutral-100">
      {/* Marca d'água — logo fixa no fundo, bem discreta, atrás de todo o
          conteúdo. Contexto de empilhamento explícito (relative + z-index
          positivo nos dois lados) pra não depender de propagação de fundo
          do body/canvas, que se comporta de forma inconsistente entre
          navegadores com z-index negativo. Experimental: fácil de remover
          revertendo este bloco. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center opacity-[0.08]"
      >
        <Image
          src="/icons/logo-mark-transparent.png"
          alt=""
          width={1200}
          height={812}
          className="h-[105vmin] w-[105vmin] object-contain"
        />
      </div>

      <header className="relative z-10 border-b border-gold-soft/30">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex shrink-0 items-center">
              <Image
                src="/icons/logo-wordmark.png"
                alt="Brazilian Ink Tattoo"
                width={1600}
                height={1083}
                priority
                className="h-20 w-auto"
              />
            </Link>
            <nav className="flex flex-wrap items-center gap-2 text-sm text-neutral-400">
              {profile.role !== "chefe_piercing" && (
                <Link href="/" className={NAV_LINK_CLASS}>
                  Agenda
                </Link>
              )}
              <Link href="/taxas" className={NAV_LINK_CLASS}>
                Taxas
              </Link>
              {profile.role === "tatuador" && (
                <Link href="/meus-clientes" className={NAV_LINK_CLASS}>
                  Meus Clientes
                </Link>
              )}
              {profile.role === "admin" && (
                <>
                  <Link href="/mapa" className={NAV_LINK_CLASS}>
                    Mapa
                  </Link>
                  <Link href="/macas" className={NAV_LINK_CLASS}>
                    Macas
                  </Link>
                  <Link href="/coworking" className={NAV_LINK_CLASS}>
                    Coworking
                  </Link>
                  <Link href="/cursos" className={NAV_LINK_CLASS}>
                    Cursos
                  </Link>
                  <Link href="/clientes" className={NAV_LINK_CLASS}>
                    Clientes
                  </Link>
                  <Link href="/fichas" className={NAV_LINK_CLASS}>
                    Fichas
                  </Link>
                  <Link href="/mensagens" className={NAV_LINK_CLASS}>
                    Mensagens
                  </Link>
                  <Link href="/contas-fixas" className={NAV_LINK_CLASS}>
                    Contas Fixas
                  </Link>
                </>
              )}
              {(profile.role === "admin" ||
                profile.role === "chefe_piercing") && (
                <>
                  <Link href="/colaboradores" className={NAV_LINK_CLASS}>
                    Colaboradores
                  </Link>
                  <Link href="/estoque" className={NAV_LINK_CLASS}>
                    Estoque
                  </Link>
                  <Link href="/servicos" className={NAV_LINK_CLASS}>
                    Serviços
                  </Link>
                  <Link href="/joias" className={NAV_LINK_CLASS}>
                    Jóias
                  </Link>
                  <Link href="/relatorios" className={NAV_LINK_CLASS}>
                    Relatórios
                  </Link>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <NotificationBell notifications={notifications ?? []} />
            <Link
              href="/minha-conta"
              className="text-right leading-tight hover:text-gold"
            >
              <div className="text-neutral-200">
                {profile.full_name || "Sem nome"}
              </div>
              <div className="text-xs text-neutral-500">
                {ROLE_LABEL[profile.role] ?? profile.role}
              </div>
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-neutral-700 px-3 py-1.5 text-neutral-300 transition-colors hover:border-gold-soft hover:text-gold"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
