// Cor determinística por colaborador/visitante — mesma pessoa sempre cai na
// mesma cor, sem precisar guardar nada no banco. Facilita bater o olho na
// agenda/mapa e ver rapidamente quem está em cada horário/maca.
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
] as const;

export type CollaboratorColor = (typeof PALETTE)[number];

export function collaboratorColor(id: string): CollaboratorColor {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
