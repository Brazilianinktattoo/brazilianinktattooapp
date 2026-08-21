-- Brazilian Ink Tattoo — dois ajustes de comanda:
-- 1) valor de comissão fica visível a todos, editável (ajuste manual) só
--    por admin — comissao_amount null = usa o cálculo automático (regra
--    70%/50%), preenchido = valor ajustado manualmente.
-- 2) Chefe de Piercing passa a poder EDITAR (não só ver) qualquer comanda
--    de piercing (colaborador piercer ou chefe_piercing), não só as suas.
-- Rode depois do supabase/034_joias_avulsas_e_estoque.sql.

alter table public.comandas
  add column if not exists commission_amount numeric(10, 2);

drop policy if exists comandas_update_own_or_admin on public.comandas;
create policy comandas_update_own_or_admin
  on public.comandas for update
  to authenticated
  using (
    collaborator_id = auth.uid()
    or public.is_admin()
    or (
      public.is_chefe_piercing() and exists (
        select 1 from public.profiles p
        where p.id = collaborator_id and p.role in ('piercer', 'chefe_piercing')
      )
    )
  )
  with check (
    collaborator_id = auth.uid()
    or public.is_admin()
    or (
      public.is_chefe_piercing() and exists (
        select 1 from public.profiles p
        where p.id = collaborator_id and p.role in ('piercer', 'chefe_piercing')
      )
    )
  );

drop policy if exists comanda_services_write_own_or_admin on public.comanda_services;
create policy comanda_services_write_own_or_admin
  on public.comanda_services for all
  to authenticated
  using (
    public.is_admin() or exists (
      select 1 from public.comandas c
      where c.id = comanda_id and c.collaborator_id = auth.uid()
    ) or exists (
      select 1 from public.comandas c
      join public.profiles p on p.id = c.collaborator_id
      where c.id = comanda_id
        and public.is_chefe_piercing()
        and p.role in ('piercer', 'chefe_piercing')
    )
  )
  with check (
    public.is_admin() or exists (
      select 1 from public.comandas c
      where c.id = comanda_id and c.collaborator_id = auth.uid()
    ) or exists (
      select 1 from public.comandas c
      join public.profiles p on p.id = c.collaborator_id
      where c.id = comanda_id
        and public.is_chefe_piercing()
        and p.role in ('piercer', 'chefe_piercing')
    )
  );

drop policy if exists comanda_products_write_own_or_admin on public.comanda_products;
create policy comanda_products_write_own_or_admin
  on public.comanda_products for all
  to authenticated
  using (
    public.is_admin() or exists (
      select 1 from public.comandas c
      where c.id = comanda_id and c.collaborator_id = auth.uid()
    ) or exists (
      select 1 from public.comandas c
      join public.profiles p on p.id = c.collaborator_id
      where c.id = comanda_id
        and public.is_chefe_piercing()
        and p.role in ('piercer', 'chefe_piercing')
    )
  )
  with check (
    public.is_admin() or exists (
      select 1 from public.comandas c
      where c.id = comanda_id and c.collaborator_id = auth.uid()
    ) or exists (
      select 1 from public.comandas c
      join public.profiles p on p.id = c.collaborator_id
      where c.id = comanda_id
        and public.is_chefe_piercing()
        and p.role in ('piercer', 'chefe_piercing')
    )
  );

drop policy if exists comanda_jewelry_write_own_or_admin on public.comanda_jewelry;
create policy comanda_jewelry_write_own_or_admin
  on public.comanda_jewelry for all
  to authenticated
  using (
    public.is_admin() or exists (
      select 1 from public.comandas c
      where c.id = comanda_id and c.collaborator_id = auth.uid()
    ) or exists (
      select 1 from public.comandas c
      join public.profiles p on p.id = c.collaborator_id
      where c.id = comanda_id
        and public.is_chefe_piercing()
        and p.role in ('piercer', 'chefe_piercing')
    )
  )
  with check (
    public.is_admin() or exists (
      select 1 from public.comandas c
      where c.id = comanda_id and c.collaborator_id = auth.uid()
    ) or exists (
      select 1 from public.comandas c
      join public.profiles p on p.id = c.collaborator_id
      where c.id = comanda_id
        and public.is_chefe_piercing()
        and p.role in ('piercer', 'chefe_piercing')
    )
  );
