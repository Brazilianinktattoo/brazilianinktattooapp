-- comandas tem RLS habilitado mas nunca ganhou uma política de DELETE —
-- sem política, o Postgres bloqueia silenciosamente (0 linhas afetadas,
-- sem erro), então o botão "Excluir comanda" parecia funcionar (a tela
-- redireciona) mas a comanda nunca era realmente apagada.

drop policy if exists comandas_delete_admin on public.comandas;
create policy comandas_delete_admin
  on public.comandas for delete
  to authenticated
  using (public.is_admin());
