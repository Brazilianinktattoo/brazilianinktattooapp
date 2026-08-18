import path from "node:path";

// Tattoo Escola BIT (cursos) e Brazilian Ink Tattoo (estúdio) são marcas
// visuais diferentes — cada grupo de documento usa a sua.
export const TATTOO_ESCOLA_LOGO = {
  path: path.join(process.cwd(), "lib/contracts/assets/tattoo-escola-bit-logo.png"),
  width: 64,
  height: 64,
};

export const BRAZILIAN_INK_LOGO = {
  path: path.join(process.cwd(), "public/icons/logo-wordmark.png"),
  width: 150,
  height: 97,
};
