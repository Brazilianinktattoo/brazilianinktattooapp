import type { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Cor por colaborador/visitante — facilita bater o olho na agenda/mapa e
// ver rapidamente quem está em cada horário/maca.
//
// Gerada em HSL a partir de um índice, girando pelo "ângulo dourado"
// (137.508°) a cada pessoa — isso espalha as cores ao redor do círculo
// cromático da forma mais uniforme possível, então não existe um número
// fixo de cores que "acaba": por mais colaboradores que o estúdio tenha,
// sempre dá pra gerar mais uma cor bem distinta da anterior. Usa estilo
// inline (não classe do Tailwind) justamente por isso — não dá pra
// pré-listar classes pra um número ilimitado de pessoas.
export type CollaboratorColor = {
  bg: string;
  text: string;
  dot: string;
  border: string;
};

const GOLDEN_ANGLE = 137.508;

function colorFromHue(hue: number): CollaboratorColor {
  const h = ((hue % 360) + 360) % 360;
  return {
    bg: `hsl(${h} 65% 50% / 0.15)`,
    text: `hsl(${h} 75% 72%)`,
    dot: `hsl(${h} 75% 60%)`,
    border: `hsl(${h} 75% 55%)`,
  };
}

// Fallback por hash — usado quando não temos o mapa de cores dos
// colaboradores fixos à mão (ou pra visitantes, que são muitos e passageiros
// demais pra merecer uma posição garantida e exclusiva no giro).
export function collaboratorColor(id: string): CollaboratorColor {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return colorFromHue(hash % 360);
}

const STAFF_ROLES: UserRole[] = ["admin", "tatuador", "piercer", "chefe_piercing"];

// Cor garantida sem repetição pra cada colaborador fixo ativo — atribuída
// pela ordem alfabética do nome (índice * ângulo dourado), então é estável
// entre renderizações e nunca colide, não importa quantos colaboradores
// existam.
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
    map.set(p.id, colorFromHue(i * GOLDEN_ANGLE));
  });
  return map;
}

export function resolveCollaboratorColor(
  id: string,
  staffColorMap: Map<string, CollaboratorColor>
): CollaboratorColor {
  return staffColorMap.get(id) ?? collaboratorColor(id);
}
