-- Ficha de anamnese em inglês/espanhol direto pelo acesso do colaborador,
-- sem precisar passar por um acesso de coworking. Reaproveita
-- coworking_anamnese_forms (mesmo PDF/assinatura/idiomas) — só destrava
-- coworking_pass_id pra aceitar fichas avulsas.
alter table public.coworking_anamnese_forms
  alter column coworking_pass_id drop not null,
  add column if not exists created_by uuid references public.profiles (id);

drop policy if exists coworking_anamnese_forms_insert_admin on public.coworking_anamnese_forms;
create policy coworking_anamnese_forms_insert_admin_or_own_standalone
  on public.coworking_anamnese_forms for insert
  to authenticated
  with check (
    public.is_admin()
    or (coworking_pass_id is null and created_by = auth.uid())
  );
