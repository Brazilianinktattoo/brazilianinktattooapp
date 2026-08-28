-- Chefe de Piercing pediu acesso a TODOS os clientes (piercing e
-- tatuagem), não só quem já tinha histórico de piercing ou foi cadastrado
-- por ele — isso travava abrir comanda pra cliente que só tinha
-- histórico de tatuagem (ela nem aparecia na lista, então não tinha como
-- selecionar). Remove a restrição de client_has_piercing_history/
-- created_by pra esse cargo nas policies de clients — vira igual à visão
-- que admin já tem.

drop policy if exists clients_select_staff on public.clients;
create policy clients_select_staff
  on public.clients for select
  to authenticated
  using (not public.is_visitante());

drop policy if exists clients_update_staff on public.clients;
create policy clients_update_staff
  on public.clients for update
  to authenticated
  using (not public.is_visitante())
  with check (not public.is_visitante());

drop policy if exists clients_delete_staff on public.clients;
create policy clients_delete_staff
  on public.clients for delete
  to authenticated
  using (not public.is_visitante());
