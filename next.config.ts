import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit lê os arquivos de métrica de fonte (.afm) do próprio node_modules
  // em runtime via caminho relativo — empacotado pelo bundler do Next,
  // esse caminho quebra (ENOENT). Mantendo como pacote externo do servidor,
  // ele é resolvido via require normal do Node.
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
