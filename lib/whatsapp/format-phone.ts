// clients.phone é salvo só com dígitos (lib/phone.ts), sem garantia de DDI.
// WhatsApp exige o número completo com código do país — assume Brasil (55)
// quando o dígito não vier presente.
export function toWhatsAppE164(phoneDigits: string): string {
  const digits = phoneDigits.replace(/\D/g, "");
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }
  // DDD (2) + número (8 ou 9 dígitos) = 10 ou 11 dígitos sem DDI.
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}
