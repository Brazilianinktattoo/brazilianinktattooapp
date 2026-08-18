export const JEWELRY_CATEGORIES = [
  "LABRET",
  "ARGOLA SEGMENTADA",
  "MICROBELL",
  "BARBELL",
  "NOSTRIL",
  "D-RING",
  "BANANABELL",
  "MEGABELL",
  "MICRODERMAL",
  "SURFACE",
  "BRINCO",
  "MICRORETO",
];

const MATERIAL_PATTERNS = [
  "TT PVD GOLD",
  "TT PVD ROSE",
  "TT PVD BLACK",
  "TT NATURAL",
  "AÇO CIRÚRGICO",
  "TITÂNIO",
];

export function deriveCategory(productName: string): string {
  const upper = productName.toUpperCase();
  for (const category of JEWELRY_CATEGORIES) {
    if (upper.includes(category)) return category;
  }
  return "";
}

export function deriveMaterial(productName: string): string {
  const upper = productName.toUpperCase();
  for (const material of MATERIAL_PATTERNS) {
    if (upper.includes(material)) return material;
  }
  return "";
}
