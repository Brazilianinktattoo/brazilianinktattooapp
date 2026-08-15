import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { logout } from "@/app/actions/auth";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  tatuador: "Tatuador(a)",
  piercer: "Body Piercer",
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireProfile();

  return (
    <div className="min-h-dvh bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="font-semibold tracking-tight">
              Brazilian Ink
            </span>
            <nav className="flex items-center gap-4 text-sm text-neutral-400">
              <Link href="/" className="hover:text-white">
                Agenda
              </Link>
              {profile.role === "admin" && (
                <>
                  <Link href="/mapa" className="hover:text-white">
                    Mapa
                  </Link>
                  <Link href="/colaboradores" className="hover:text-white">
                    Colaboradores
                  </Link>
                  <Link href="/macas" className="hover:text-white">
                    Macas
                  </Link>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <div className="text-right leading-tight">
              <div className="text-neutral-200">
                {profile.full_name || "Sem nome"}
              </div>
              <div className="text-xs text-neutral-500">
                {ROLE_LABEL[profile.role] ?? profile.role}
              </div>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:border-neutral-500 hover:text-white"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
