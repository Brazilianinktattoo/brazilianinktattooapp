const UNITS = [
  "",
  "um",
  "dois",
  "três",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
  "dez",
  "onze",
  "doze",
  "treze",
  "quatorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove",
];
const TENS = [
  "",
  "",
  "vinte",
  "trinta",
  "quarenta",
  "cinquenta",
  "sessenta",
  "setenta",
  "oitenta",
  "noventa",
];
const HUNDREDS = [
  "",
  "cento",
  "duzentos",
  "trezentos",
  "quatrocentos",
  "quinhentos",
  "seiscentos",
  "setecentos",
  "oitocentos",
  "novecentos",
];

function threeDigitsToWords(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (h > 0) parts.push(HUNDREDS[h]);
  if (rest > 0) {
    if (rest < 20) {
      parts.push(UNITS[rest]);
    } else {
      const t = Math.floor(rest / 10);
      const u = rest % 10;
      parts.push(TENS[t] + (u > 0 ? ` e ${UNITS[u]}` : ""));
    }
  }
  return parts.join(" e ");
}

function integerToWords(n: number): string {
  if (n === 0) return "zero";
  const groups = [
    { value: 1_000_000, singular: "milhão", plural: "milhões" },
    { value: 1_000, singular: "mil", plural: "mil" },
  ];
  let remaining = n;
  const parts: string[] = [];
  for (const g of groups) {
    const count = Math.floor(remaining / g.value);
    if (count > 0) {
      const label = count === 1 ? g.singular : g.plural;
      const countWords = count === 1 && g.value === 1_000 ? "" : threeDigitsToWords(count) + " ";
      parts.push(`${countWords}${label}`.trim());
      remaining %= g.value;
    }
  }
  if (remaining > 0) {
    parts.push(threeDigitsToWords(remaining));
  }
  return parts.join(" e ");
}

// Ex: 1500.5 -> "mil e quinhentos reais e cinquenta centavos"
export function amountToWordsPtBr(amount: number): string {
  const cents = Math.round(amount * 100);
  const reais = Math.floor(cents / 100);
  const centavos = cents % 100;

  const reaisWords =
    reais === 0
      ? ""
      : `${integerToWords(reais)} ${reais === 1 ? "real" : "reais"}`;
  const centavosWords =
    centavos === 0
      ? ""
      : `${integerToWords(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`;

  if (reaisWords && centavosWords) return `${reaisWords} e ${centavosWords}`;
  return reaisWords || centavosWords || "zero reais";
}
