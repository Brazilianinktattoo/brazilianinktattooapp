-- Brazilian Ink Tattoo — exclusão definitiva de agendamento (admin) + sync
-- de e-mail quando o admin edita o cadastro de um colaborador.
-- Rode depois do supabase/005_notificacoes.sql.

-- 1. Admin pode excluir definitivamente um agendamento -----------------------
-- (cancelar continua sendo o update de status; isto é além disso)

drop policy if exists appointments_delete_admin on public.appointments;
create policy appointments_delete_admin
  on public.appointments for delete
  to authenticated
  using (public.is_admin());

-- 2. Mantém public.profiles.email em sincronia com auth.users.email ---------
-- app/actions/collaborators.ts troca o e-mail via API admin do Supabase
-- (auth.users é a fonte da verdade do login); este trigger espelha o valor
-- em profiles para exibição, igual ao handle_new_user faz na criação.

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.sync_profile_email();
