-- Brazilian Ink Tattoo — Fase 8: Autorização de Piercing para Menores
-- Rode depois do supabase/020_documentos_storage.sql.
--
-- Disparada automaticamente quando anamnese_forms.is_minor = true. Link
-- público separado, assinado pelo responsável legal (não pelo cliente
-- menor). Baseada no modelo real Autorização Piercing para menores.docx.

create table if not exists public.minor_authorization_forms (
  id uuid primary key default gen_random_uuid(),
  anamnese_form_id uuid not null unique references public.anamnese_forms (id) on delete cascade,

  guardian_name text not null default '',
  guardian_rg text not null default '',
  guardian_cpf text not null default '',
  guardian_birth_date date,
  guardian_marital_status text not null default '',
  guardian_address text not null default '',
  guardian_neighborhood text not null default '',
  guardian_city text not null default '',
  guardian_state text not null default '',
  guardian_cep text not null default '',
  guardian_phone text not null default '',
  guardian_email text not null default '',

  minor_name text not null default '',
  minor_rg text not null default '',
  minor_cpf text not null default '',
  minor_birth_date date,
  minor_phone text not null default '',
  minor_email text not null default '',
  minor_health_declaration jsonb not null default '{}'::jsonb,

  piercer_name text not null default '',
  body_location text not null default '',

  file_path text,
  sign_token uuid not null default gen_random_uuid() unique,
  signed_at timestamptz,
  signer_name text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_minor_authorization_forms_updated_at on public.minor_authorization_forms;
create trigger set_minor_authorization_forms_updated_at
  before update on public.minor_authorization_forms
  for each row execute function public.set_updated_at();

alter table public.minor_authorization_forms enable row level security;

drop policy if exists minor_authorization_forms_select_authenticated on public.minor_authorization_forms;
create policy minor_authorization_forms_select_authenticated
  on public.minor_authorization_forms for select
  to authenticated
  using (true);

drop policy if exists minor_authorization_forms_insert_own_or_admin on public.minor_authorization_forms;
create policy minor_authorization_forms_insert_own_or_admin
  on public.minor_authorization_forms for insert
  to authenticated
  with check (
    public.is_admin() or exists (
      select 1 from public.anamnese_forms af
      join public.appointments a on a.id = af.appointment_id
      where af.id = anamnese_form_id and a.collaborator_id = auth.uid()
    )
  );

-- preenchimento/assinatura do responsável acontece via link público — sem
-- policy de update aqui de propósito, igual anamnese_forms.
