import type { ClientOrigin, HowMet } from "@/lib/types/database";

// "Quem trouxe" — define a comissão de 70% no Downtown (a regra do Barra
// Shopping vem da unidade da comanda, não daqui).
export const CLIENT_ORIGIN_OPTIONS: { value: ClientOrigin; label: string }[] = [
  { value: "trazido_pelo_tatuador", label: "Fui trazido(a) por um tatuador(a)" },
  { value: "indicado_pelo_estudio", label: "Vim pelo estúdio (não trazido por um tatuador específico)" },
];

export const CLIENT_ORIGIN_LABEL: Record<ClientOrigin, string> = {
  trazido_pelo_tatuador: "Tatuador",
  indicado_pelo_estudio: "Estúdio",
};

export const HOW_MET_OPTIONS: { value: HowMet; label: string }[] = [
  { value: "instagram_estudio", label: "Instagram do estúdio" },
  { value: "google", label: "Google" },
  { value: "indicacao_cliente", label: "Indicação de cliente" },
  { value: "passou_na_porta", label: "Passou na porta" },
  { value: "anuncio", label: "Anúncio" },
  { value: "escola_bit", label: "Escola BIT" },
  { value: "instagram_artista", label: "Instagram do artista" },
  { value: "outro", label: "Outro" },
];

export const HOW_MET_LABEL = Object.fromEntries(
  HOW_MET_OPTIONS.map((o) => [o.value, o.label])
) as Record<HowMet, string>;
