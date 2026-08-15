-- Brazilian Ink Tattoo — Fase 3: estoque único e centralizado (Downtown)
-- Rode depois do supabase/006_admin_extras.sql.
--
-- Não existe separação de estoque por unidade — um produto usado em
-- qualquer unidade desconta desse único saldo. Quem consome em qual
-- unidade é registrado nas comandas (ver 008_comandas.sql), não aqui.

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  quantity numeric(10, 2) not null default 0,
  min_stock numeric(10, 2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

alter table public.products enable row level security;

drop policy if exists products_select_authenticated on public.products;
create policy products_select_authenticated
  on public.products for select
  to authenticated
  using (true);

drop policy if exists products_write_admin on public.products;
create policy products_write_admin
  on public.products for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Entrada de material: sempre soma ao estoque único, sem escolher unidade.

create table if not exists public.stock_entries (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id),
  quantity numeric(10, 2) not null check (quantity > 0),
  note text not null default '',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists stock_entries_product_idx
  on public.stock_entries (product_id, created_at);

alter table public.stock_entries enable row level security;

drop policy if exists stock_entries_select_authenticated on public.stock_entries;
create policy stock_entries_select_authenticated
  on public.stock_entries for select
  to authenticated
  using (true);

drop policy if exists stock_entries_insert_admin on public.stock_entries;
create policy stock_entries_insert_admin
  on public.stock_entries for insert
  to authenticated
  with check (public.is_admin());

create or replace function public.apply_stock_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products
  set quantity = quantity + new.quantity
  where id = new.product_id;
  return new;
end;
$$;

drop trigger if exists apply_stock_entry_trigger on public.stock_entries;
create trigger apply_stock_entry_trigger
  after insert on public.stock_entries
  for each row execute function public.apply_stock_entry();
