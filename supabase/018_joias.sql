-- Brazilian Ink Tattoo — Fase 8: catálogo de jóias + item de jóia na comanda
-- Rode depois do supabase/017_catalogo_servicos.sql.
--
-- Catálogo de tipos de jóia — cadastro/estoque (código, cód. barras,
-- categoria, material, custo, quantidade) + valor por operação na comanda
-- (aplicação/troca/venda) — válido pras duas unidades, gerenciado pelo chefe
-- de piercing (com acesso total, diferente do estoque de produtos que é
-- escopado por categoria). price_venda é o "Valor Venda" padrão do item;
-- price_aplicacao/price_troca ficam em 0 até o chefe de piercing configurar.

create table if not exists public.jewelry_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null default '',
  barcode text not null default '',
  category text not null default '',
  material text not null default '',
  cost_value numeric(10, 2) not null default 0,
  stock_quantity numeric(10, 2) not null default 0,
  price_aplicacao numeric(10, 2) not null default 0,
  price_troca numeric(10, 2) not null default 0,
  price_venda numeric(10, 2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_jewelry_catalog_updated_at on public.jewelry_catalog;
create trigger set_jewelry_catalog_updated_at
  before update on public.jewelry_catalog
  for each row execute function public.set_updated_at();

alter table public.jewelry_catalog enable row level security;

drop policy if exists jewelry_catalog_select_authenticated on public.jewelry_catalog;
create policy jewelry_catalog_select_authenticated
  on public.jewelry_catalog for select
  to authenticated
  using (true);

drop policy if exists jewelry_catalog_write_admin_or_chefe_piercing on public.jewelry_catalog;
create policy jewelry_catalog_write_admin_or_chefe_piercing
  on public.jewelry_catalog for all
  to authenticated
  using (public.is_admin() or public.is_chefe_piercing())
  with check (public.is_admin() or public.is_chefe_piercing());

-- item de jóia lançado numa comanda específica — guarda nome/valor congelados
-- no momento do lançamento, igual serviço e produto.
create table if not exists public.comanda_jewelry (
  id uuid primary key default gen_random_uuid(),
  comanda_id uuid not null references public.comandas (id) on delete cascade,
  jewelry_catalog_id uuid references public.jewelry_catalog (id),
  jewelry_name text not null,
  operation text not null check (operation in ('aplicada', 'trocada', 'vendida')),
  value numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_comanda_jewelry_updated_at on public.comanda_jewelry;
create trigger set_comanda_jewelry_updated_at
  before update on public.comanda_jewelry
  for each row execute function public.set_updated_at();

-- reaproveita a mesma trava de "comanda precisa estar aberta" usada em
-- comanda_services (public.check_comanda_open(), definida em 008_comandas.sql)
drop trigger if exists check_comanda_open_jewelry_trigger on public.comanda_jewelry;
create trigger check_comanda_open_jewelry_trigger
  before insert or update or delete on public.comanda_jewelry
  for each row execute function public.check_comanda_open();

alter table public.comanda_jewelry enable row level security;

drop policy if exists comanda_jewelry_select_authenticated on public.comanda_jewelry;
create policy comanda_jewelry_select_authenticated
  on public.comanda_jewelry for select
  to authenticated
  using (true);

drop policy if exists comanda_jewelry_write_own_or_admin on public.comanda_jewelry;
create policy comanda_jewelry_write_own_or_admin
  on public.comanda_jewelry for all
  to authenticated
  using (
    public.is_admin() or exists (
      select 1 from public.comandas c
      where c.id = comanda_id and c.collaborator_id = auth.uid()
    )
  )
  with check (
    public.is_admin() or exists (
      select 1 from public.comandas c
      where c.id = comanda_id and c.collaborator_id = auth.uid()
    )
  );
