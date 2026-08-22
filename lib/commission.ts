import type { ClientOrigin } from "@/lib/types/database";

// Regra de comissão do estúdio (só pra Tatuador/Admin — Chefe de
// Piercing/Body Piercer ganham a mesma comissão em qualquer unidade, sem
// regra automática, ver useAutomaticRule abaixo):
//   Barra Shopping — sempre 50% pro colaborador, linear.
//   Downtown       — 70% se o cliente é próprio do colaborador (ele que
//                     trouxe), 50% se veio pelo estúdio.
// Qualquer unidade que não seja "Barra Shopping" cai na regra do Downtown.
// Admin pode sobrescrever com uma taxa fixa por colaborador (profiles.
// commission_rate, editável em /comissoes) — quando definida, ignora a
// regra automática por unidade/origem do cliente.
export function commissionRate(
  unitName: string,
  clientIsOwn: boolean,
  overrideRate?: number | null,
  useAutomaticRule: boolean = true
): number {
  if (overrideRate !== null && overrideRate !== undefined) return overrideRate;
  if (!useAutomaticRule) return 0;
  const isBarraShopping = unitName.toLowerCase().includes("barra");
  if (isBarraShopping) return 0.5;
  return clientIsOwn ? 0.7 : 0.5;
}

// Comissão sobre venda de jóia (Chefe de Piercing/Body Piercer) — separada
// da comissão sobre serviço, sem regra automática: fica 0 até o Admin
// definir uma taxa fixa por colaborador (profiles.commission_rate_sales).
export function salesCommissionRate(overrideRate?: number | null): number {
  return overrideRate ?? 0;
}

// A ficha de anamnese (quando preenchida e assinada) é a fonte preferida
// pra origem do cliente — só cai pro checkbox do agendamento (preenchido
// pelo staff) enquanto a ficha ainda não foi respondida pelo cliente.
export function resolveClientIsOwn(
  appointmentClientIsOwn: boolean,
  anamneseClientOrigin: ClientOrigin | null | undefined,
  anamneseSignedAt: string | null | undefined
): boolean {
  if (anamneseSignedAt && anamneseClientOrigin) {
    return anamneseClientOrigin === "trazido_pelo_tatuador";
  }
  return appointmentClientIsOwn;
}
