import type { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Cor por colaborador/visitante — facilita bater o olho na agenda/mapa e
// ver rapidamente quem está em cada horário/maca.
const PALETTE = [
  { bg: "bg-blue-500/15", text: "text-blue-400", dot: "bg-blue-400", border: "border-l-blue-500" },
  { bg: "bg-emerald-500/15", text: "text-emerald-400", dot: "bg-emerald-400", border: "border-l-emerald-500" },
  { bg: "bg-amber-500/15", text: "text-amber-400", dot: "bg-amber-400", border: "border-l-amber-500" },
  { bg: "bg-pink-500/15", text: "text-pink-400", dot: "bg-pink-400", border: "border-l-pink-500" },
  { bg: "bg-purple-500/15", text: "text-purple-400", dot: "bg-purple-400", border: "border-l-purple-500" },
  { bg: "bg-cyan-500/15", text: "text-cyan-400", dot: "bg-cyan-400", border: "border-l-cyan-500" },
  { bg: "bg-orange-500/15", text: "text-orange-400", dot: "bg-orange-400", border: "border-l-orange-500" },
  { bg: "bg-lime-500/15", text: "text-lime-400", dot: "bg-lime-400", border: "border-l-lime-500" },
  { bg: "bg-fuchsia-500/15", text: "text-fuchsia-400", dot: "bg-fuchsia-400", border: "border-l-fuchsia-500" },
  { bg: "bg-sky-500/15", text: "text-sky-400", dot: "bg-sky-400", border: "border-l-sky-500" },
  { bg: "bg-red-500/15", text: "text-red-400", dot: "bg-red-400", border: "border-l-red-500" },
  { bg: "bg-teal-500/15", text: "text-teal-400", dot: "bg-teal-400", border: "border-l-teal-500" },
  { bg: "bg-indigo-500/15", text: "text-indigo-400", dot: "bg-indigo-400", border: "border-l-indigo-500" },
  { bg: "bg-rose-500/15", text: "text-rose-400", dot: "bg-rose-400", border: "border-l-rose-500" },
  { bg: "bg-yellow-500/15", text: "text-yellow-400", dot: "bg-yellow-400", border: "border-l-yellow-500" },
  { bg: "bg-violet-500/15", text: "text-violet-400", dot: "bg-violet-400", border: "border-l-violet-500" },
] as const;

export type CollaboratorColor = (typeof PALETTE)[number];

// Fallback por hash — usado quando não temos o mapa de cores dos
// colaboradores fixos à mão (ou pra visitantes, que são muitos e passageiros
// demais pra merecer uma cor garantida e exclusiva).
export function collaboratorColor(id: string): CollaboratorColor {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

const STAFF_ROLES: UserRole[] = ["admin", "tatuador", "piercer", "chefe_piercing"];

// Cor garantida sem repetição pra cada colaborador fixo ativo — atribuída
// pela ordem alfabética do nome, então é estável entre renderizações
// (não muda de um carregamento de página pro outro).
export async function getStaffColorMap(
  supabase: SupabaseServerClient
): Promise<Map<string, CollaboratorColor>> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .in("role", STAFF_ROLES)
    .eq("active", true)
    .order("full_name");

  const map = new Map<string, CollaboratorColor>();
  (data ?? []).forEach((p: { id: string }, i: number) => {
    map.set(p.id, PALETTE[i % PALETTE.length]);
  });
  return map;
}

export function resolveCollaboratorColor(
  id: string,
  staffColorMap: Map<string, CollaboratorColor>
): CollaboratorColor {
  return staffColorMap.get(id) ?? collaboratorColor(id);
}
