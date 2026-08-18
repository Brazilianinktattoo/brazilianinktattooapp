-- Brazilian Ink Tattoo — Chefe de Piercing: permissões escopadas
-- Rode depois do supabase/010a_enum_chefe_piercing.sql (em um Run separado).
--
-- Regra geral: Chefe de Piercing gerencia colaboradores role=piercer, vê e
-- edita só produtos categoria='piercing', e só enxerga agendamentos/comandas
-- de colaboradores role=piercer. Nenhum acesso a dados de tatuagem.

create or replace function public.is_chefe_piercing()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'chefe_piercing' and active
  );
$$;

-- 1. Categoria de produto (geral vs piercing) --------------------------------

alter table public.products
  add column if not exists category text not null default 'geral'
    check (category in ('geral', 'piercing'));

-- 2. Colaboradores: chefe_piercing só edita quem já é piercer ----------------
-- (criar continua passando pela service_role no server action; a role fica
-- travada em 'piercer' lá — ver app/actions/collaborators.ts)

drop policy if exists profiles_update_chefe_piercing on public.profiles;
create policy profiles_update_chefe_piercing
  on public.profiles for update
  to authenticated
  using (public.is_chefe_piercing() and role = 'piercer')
  with check (public.is_chefe_piercing() and role = 'piercer');

-- 3. Estoque: separa "geral" (todo mundo) de "piercing" (só chefe_piercing) --

drop policy if exists products_select_authenticated on public.products;
drop policy if exists products_select_others on public.products;
create policy products_select_others
  on public.products for select
  to authenticated
  using (not public.is_chefe_piercing());

drop policy if exists products_select_chefe_piercing on public.products;
create policy products_select_chefe_piercing
  on public.products for select
  to authenticated
  using (public.is_chefe_piercing() and category = 'piercing');

drop policy if exists products_write_chefe_piercing on public.products;
create policy products_write_chefe_piercing
  on public.products for all
  to authenticated
  using (public.is_chefe_piercing() and category = 'piercing')
  with check (public.is_chefe_piercing() and category = 'piercing');

drop policy if exists stock_entries_select_authenticated on public.stock_entries;
drop policy if exists stock_entries_select_others on public.stock_entries;
create policy stock_entries_select_others
  on public.stock_entries for select
  to authenticated
  using (not public.is_chefe_piercing());

drop policy if exists stock_entries_select_chefe_piercing on public.stock_entries;
create policy stock_entries_select_chefe_piercing
  on public.stock_entries for select
  to authenticated
  using (
    public.is_chefe_piercing() and exists (
      select 1 from public.products p
      where p.id = product_id and p.category = 'piercing'
    )
  );

drop policy if exists stock_entries_insert_chefe_piercing on public.stock_entries;
create policy stock_entries_insert_chefe_piercing
  on public.stock_entries for insert
  to authenticated
  with check (
    public.is_chefe_piercing() and exists (
      select 1 from public.products p
      where p.id = product_id and p.category = 'piercing'
    )
  );

-- 4. Agenda e comandas: chefe_piercing só enxerga o que é de body piercer ----

drop policy if exists appointments_select_authenticated on public.appointments;
drop policy if exists appointments_select_others on public.appointments;
create policy appointments_select_others
  on public.appointments for select
  to authenticated
  using (not public.is_chefe_piercing());

drop policy if exists appointments_select_chefe_piercing on public.appointments;
create policy appointments_select_chefe_piercing
  on public.appointments for select
  to authenticated
  using (
    public.is_chefe_piercing() and exists (
      select 1 from public.profiles p
      where p.id = collaborator_id and p.role = 'piercer'
    )
  );

drop policy if exists comandas_select_authenticated on public.comandas;
drop policy if exists comandas_select_others on public.comandas;
create policy comandas_select_others
  on public.comandas for select
  to authenticated
  using (not public.is_chefe_piercing());

drop policy if exists comandas_select_chefe_piercing on public.comandas;
create policy comandas_select_chefe_piercing
  on public.comandas for select
  to authenticated
  using (
    public.is_chefe_piercing() and exists (
      select 1 from public.profiles p
      where p.id = collaborator_id and p.role = 'piercer'
    )
  );

drop policy if exists comanda_services_select_authenticated on public.comanda_services;
drop policy if exists comanda_services_select_others on public.comanda_services;
create policy comanda_services_select_others
  on public.comanda_services for select
  to authenticated
  using (not public.is_chefe_piercing());

drop policy if exists comanda_services_select_chefe_piercing on public.comanda_services;
create policy comanda_services_select_chefe_piercing
  on public.comanda_services for select
  to authenticated
  using (
    public.is_chefe_piercing() and exists (
      select 1 from public.comandas c
      join public.profiles p on p.id = c.collaborator_id
      where c.id = comanda_id and p.role = 'piercer'
    )
  );

drop policy if exists comanda_products_select_authenticated on public.comanda_products;
drop policy if exists comanda_products_select_others on public.comanda_products;
create policy comanda_products_select_others
  on public.comanda_products for select
  to authenticated
  using (not public.is_chefe_piercing());

drop policy if exists comanda_products_select_chefe_piercing on public.comanda_products;
create policy comanda_products_select_chefe_piercing
  on public.comanda_products for select
  to authenticated
  using (
    public.is_chefe_piercing() and exists (
      select 1 from public.comandas c
      join public.profiles p on p.id = c.collaborator_id
      where c.id = comanda_id and p.role = 'piercer'
    )
  );
