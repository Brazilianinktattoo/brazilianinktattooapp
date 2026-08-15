-- Brazilian Ink Tattoo — Fase 3: comandas (serviços + produtos)
-- Rode depois do supabase/007_estoque.sql.

create table if not exists public.comandas (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments (id),
  -- forçados a partir do agendamento vinculado, ver trigger abaixo
  collaborator_id uuid not null references public.profiles (id),
  unit_id uuid not null references public.units (id),
  status text not null default 'aberta' check (status in ('aberta', 'fechada')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

drop trigger if exists set_comandas_updated_at on public.comandas;
create trigger set_comandas_updated_at
  before update on public.comandas
  for each row execute function public.set_updated_at();

-- unidade e colaborador responsável sempre vêm do agendamento vinculado —
-- não são escolhidos livremente ao abrir a comanda
create or replace function public.set_comanda_from_appointment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_collaborator_id uuid;
  v_unit_id uuid;
begin
  select collaborator_id, unit_id into v_collaborator_id, v_unit_id
  from public.appointments
  where id = new.appointment_id;

  if not found then
    raise exception 'Agendamento nao encontrado.';
  end if;

  new.collaborator_id := v_collaborator_id;
  new.unit_id := v_unit_id;
  return new;
end;
$$;

drop trigger if exists set_comanda_from_appointment_trigger on public.comandas;
create trigger set_comanda_from_appointment_trigger
  before insert on public.comandas
  for each row execute function public.set_comanda_from_appointment();

create or replace function public.handle_comanda_close()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'fechada' and old.status is distinct from 'fechada' then
    new.closed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists handle_comanda_close_trigger on public.comandas;
create trigger handle_comanda_close_trigger
  before update on public.comandas
  for each row execute function public.handle_comanda_close();

alter table public.comandas enable row level security;

drop policy if exists comandas_select_authenticated on public.comandas;
create policy comandas_select_authenticated
  on public.comandas for select
  to authenticated
  using (true);

drop policy if exists comandas_insert_own_or_admin on public.comandas;
create policy comandas_insert_own_or_admin
  on public.comandas for insert
  to authenticated
  with check (
    public.is_admin() or exists (
      select 1 from public.appointments a
      where a.id = appointment_id and a.collaborator_id = auth.uid()
    )
  );

drop policy if exists comandas_update_own_or_admin on public.comandas;
create policy comandas_update_own_or_admin
  on public.comandas for update
  to authenticated
  using (collaborator_id = auth.uid() or public.is_admin())
  with check (collaborator_id = auth.uid() or public.is_admin());

-- 2. Serviços realizados ------------------------------------------------------

create table if not exists public.comanda_services (
  id uuid primary key default gen_random_uuid(),
  comanda_id uuid not null references public.comandas (id) on delete cascade,
  description text not null,
  price numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_comanda_services_updated_at on public.comanda_services;
create trigger set_comanda_services_updated_at
  before update on public.comanda_services
  for each row execute function public.set_updated_at();

-- só permite editar linhas de uma comanda ainda aberta
create or replace function public.check_comanda_open()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_comanda_id uuid;
  comanda_status text;
begin
  target_comanda_id := coalesce(new.comanda_id, old.comanda_id);
  select status into comanda_status from public.comandas where id = target_comanda_id;

  if comanda_status is distinct from 'aberta' then
    raise exception 'Comanda fechada, nao e possivel editar.';
  end if;

  if TG_OP = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists check_comanda_open_services_trigger on public.comanda_services;
create trigger check_comanda_open_services_trigger
  before insert or update or delete on public.comanda_services
  for each row execute function public.check_comanda_open();

alter table public.comanda_services enable row level security;

drop policy if exists comanda_services_select_authenticated on public.comanda_services;
create policy comanda_services_select_authenticated
  on public.comanda_services for select
  to authenticated
  using (true);

drop policy if exists comanda_services_write_own_or_admin on public.comanda_services;
create policy comanda_services_write_own_or_admin
  on public.comanda_services for all
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

-- 3. Produtos utilizados (baixa automática no estoque único) -----------------

create table if not exists public.comanda_products (
  id uuid primary key default gen_random_uuid(),
  comanda_id uuid not null references public.comandas (id) on delete cascade,
  product_id uuid not null references public.products (id),
  quantity numeric(10, 2) not null check (quantity > 0),
  unit_price numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_comanda_products_updated_at on public.comanda_products;
create trigger set_comanda_products_updated_at
  before update on public.comanda_products
  for each row execute function public.set_updated_at();

-- comanda precisa estar aberta + baixa/estorna o estoque único (Downtown)
create or replace function public.handle_comanda_product_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_comanda_id uuid;
  comanda_status text;
  current_qty numeric;
begin
  target_comanda_id := coalesce(new.comanda_id, old.comanda_id);
  select status into comanda_status from public.comandas where id = target_comanda_id;

  if comanda_status is distinct from 'aberta' then
    raise exception 'Comanda fechada, nao e possivel editar.';
  end if;

  if TG_OP = 'INSERT' then
    select quantity into current_qty from public.products where id = new.product_id;
    if current_qty - new.quantity < 0 then
      raise exception 'Estoque insuficiente para este produto.';
    end if;
    update public.products set quantity = quantity - new.quantity where id = new.product_id;
    return new;
  end if;

  if TG_OP = 'UPDATE' then
    if old.product_id is distinct from new.product_id then
      update public.products set quantity = quantity + old.quantity where id = old.product_id;
      select quantity into current_qty from public.products where id = new.product_id;
      if current_qty - new.quantity < 0 then
        raise exception 'Estoque insuficiente para este produto.';
      end if;
      update public.products set quantity = quantity - new.quantity where id = new.product_id;
    else
      select quantity into current_qty from public.products where id = new.product_id;
      if current_qty + old.quantity - new.quantity < 0 then
        raise exception 'Estoque insuficiente para este produto.';
      end if;
      update public.products
      set quantity = quantity + old.quantity - new.quantity
      where id = new.product_id;
    end if;
    return new;
  end if;

  if TG_OP = 'DELETE' then
    update public.products set quantity = quantity + old.quantity where id = old.product_id;
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists handle_comanda_product_change_trigger on public.comanda_products;
create trigger handle_comanda_product_change_trigger
  before insert or update or delete on public.comanda_products
  for each row execute function public.handle_comanda_product_change();

alter table public.comanda_products enable row level security;

drop policy if exists comanda_products_select_authenticated on public.comanda_products;
create policy comanda_products_select_authenticated
  on public.comanda_products for select
  to authenticated
  using (true);

drop policy if exists comanda_products_write_own_or_admin on public.comanda_products;
create policy comanda_products_write_own_or_admin
  on public.comanda_products for all
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

-- 4. Índices para relatório por tatuador / período / unidade -----------------

create index if not exists comandas_collaborator_created_idx
  on public.comandas (collaborator_id, created_at);
create index if not exists comandas_unit_created_idx
  on public.comandas (unit_id, created_at);
