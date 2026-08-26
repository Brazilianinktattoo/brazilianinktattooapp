-- Amplia o acesso do Chefe de Piercing:
-- 1) pode abrir e excluir comanda de qualquer body piercer (já podia ver e
--    editar, faltavam insert/delete)
-- 2) fica restrito, nos CADASTROS DE CLIENTE, a clientes com histórico de
--    piercing (ou que ele mesmo cadastrou) — sem acesso a clientes que só
--    fizeram tatuagem. Criação de cliente novo continua liberada (ainda não
--    dá pra saber se o cliente é de piercing ou tatuagem nesse momento).

create or replace function public.client_has_piercing_history(target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.appointments a
    join public.profiles p on p.id = a.collaborator_id
    where a.client_id = target_client_id
      and p.role in ('piercer', 'chefe_piercing')
  );
$$;

-- comandas: insert/delete pro Chefe de Piercing sobre comandas de piercing
drop policy if exists comandas_insert_own_or_admin on public.comandas;
create policy comandas_insert_own_or_admin
  on public.comandas for insert
  to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1 from public.appointments a
      where a.id = appointment_id and a.collaborator_id = auth.uid()
    )
    or (
      public.is_chefe_piercing()
      and exists (
        select 1
        from public.appointments a
        join public.profiles p on p.id = a.collaborator_id
        where a.id = appointment_id and p.role in ('piercer', 'chefe_piercing')
      )
    )
  );

drop policy if exists comandas_delete_admin on public.comandas;
create policy comandas_delete_admin
  on public.comandas for delete
  to authenticated
  using (
    public.is_admin()
    or (
      public.is_chefe_piercing()
      and exists (
        select 1 from public.profiles p
        where p.id = collaborator_id and p.role in ('piercer', 'chefe_piercing')
      )
    )
  );

-- clients: Chefe de Piercing só vê/edita clientes com histórico de piercing
-- (ou cadastrados por ele mesmo) — outros cargos continuam sem mudança.
drop policy if exists clients_staff_all on public.clients;

create policy clients_select_staff
  on public.clients for select
  to authenticated
  using (
    not public.is_visitante()
    and (
      not public.is_chefe_piercing()
      or created_by = auth.uid()
      or public.client_has_piercing_history(id)
    )
  );

create policy clients_insert_staff
  on public.clients for insert
  to authenticated
  with check (not public.is_visitante());

create policy clients_update_staff
  on public.clients for update
  to authenticated
  using (
    not public.is_visitante()
    and (
      not public.is_chefe_piercing()
      or created_by = auth.uid()
      or public.client_has_piercing_history(id)
    )
  )
  with check (
    not public.is_visitante()
    and (
      not public.is_chefe_piercing()
      or created_by = auth.uid()
      or public.client_has_piercing_history(id)
    )
  );

create policy clients_delete_staff
  on public.clients for delete
  to authenticated
  using (
    not public.is_visitante()
    and (
      not public.is_chefe_piercing()
      or created_by = auth.uid()
      or public.client_has_piercing_history(id)
    )
  );
