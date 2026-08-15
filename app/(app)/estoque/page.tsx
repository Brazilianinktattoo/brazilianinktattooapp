import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types/database";
import { NewProductForm } from "./new-product-form";
import { NewEntryForm } from "./new-entry-form";
import { ProductRow } from "./product-row";

export default async function EstoquePage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .order("name")
    .returns<Product[]>();

  const list = products ?? [];
  const activeProducts = list.filter((p) => p.active);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Estoque</h1>
        <p className="text-neutral-400">
          Estoque único e centralizado (Downtown) — usado por comandas das
          duas unidades.
        </p>
      </div>

      <NewProductForm />
      <NewEntryForm products={activeProducts} />

      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-800 text-neutral-500">
              <th className="py-3 pl-4 pr-4 font-medium">Produto</th>
              <th className="py-3 pr-4 font-medium">Quantidade</th>
              <th className="py-3 pr-4 font-medium">Estoque mínimo</th>
              <th className="py-3 pr-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map((product) => (
              <ProductRow key={product.id} product={product} />
            ))}
          </tbody>
        </table>
        {list.length === 0 && (
          <p className="p-6 text-center text-neutral-500">
            Nenhum produto cadastrado ainda.
          </p>
        )}
      </div>
    </div>
  );
}
