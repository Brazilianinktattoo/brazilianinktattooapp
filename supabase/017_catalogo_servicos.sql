-- Brazilian Ink Tattoo — Fase 8: catálogo de serviços com preço editável
-- Rode depois do supabase/016_taxas_stone.sql.
--
-- Preço do serviço é editável pelo admin (e pelo chefe_piercing, só pra
-- categoria piercing) a qualquer momento. Uma vez lançado numa comanda, o
-- valor fica congelado em comanda_services.price — reajustar o catálogo
-- depois não muda comandas já lançadas.

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('tatuagem', 'piercing')),
  price numeric(10, 2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_services_updated_at on public.services;
create trigger set_services_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

alter table public.services enable row level security;

drop policy if exists services_select_authenticated on public.services;
create policy services_select_authenticated
  on public.services for select
  to authenticated
  using (true);

drop policy if exists services_write_admin_or_chefe_piercing on public.services;
create policy services_write_admin_or_chefe_piercing
  on public.services for all
  to authenticated
  using (
    public.is_admin()
    or (public.is_chefe_piercing() and category = 'piercing')
  )
  with check (
    public.is_admin()
    or (public.is_chefe_piercing() and category = 'piercing')
  );

-- referência opcional ao catálogo — o serviço lançado na comanda continua
-- guardando description/price livres (permite ajuste pontual e serviço
-- avulso fora do catálogo), só passa a registrar de onde veio o valor.
alter table public.comanda_services
  add column if not exists service_id uuid references public.services (id);
