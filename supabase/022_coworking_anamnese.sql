-- Brazilian Ink Tattoo — Fase 8: ficha de anamnese do coworking (tatuadores
-- e body piercers visitantes), em 3 idiomas. Rode depois do
-- supabase/021_autorizacao_menores.sql.
--
-- Uma ficha por acesso de coworking (coworking_passes), no idioma escolhido
-- na hora de gerar o acesso. Baseada nos modelos reais
-- Ficha_Anamnese_BIT_Portugues/Ingles/Espanhol.docx — mesmo texto/estrutura,
-- só muda o idioma renderizado no PDF.

create table if not exists public.coworking_anamnese_forms (
  id uuid primary key default gen_random_uuid(),
  coworking_pass_id uuid not null unique references public.coworking_passes (id) on delete cascade,
  language text not null check (language in ('portugues', 'ingles', 'espanhol')),

  full_name text not null default '',
  cpf text not null default '',
  address text not null default '',
  cep text not null default '',
  birth_date date,
  phone text not null default '',
  procedure_type text check (procedure_type in ('tatuagem', 'piercing')),

  health_declaration jsonb not null default '{}'::jsonb,

  file_path text,
  sign_token uuid not null default gen_random_uuid() unique,
  signed_at timestamptz,
  signer_name text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_coworking_anamnese_forms_updated_at on public.coworking_anamnese_forms;
create trigger set_coworking_anamnese_forms_updated_at
  before update on public.coworking_anamnese_forms
  for each row execute function public.set_updated_at();

alter table public.coworking_anamnese_forms enable row level security;

drop policy if exists coworking_anamnese_forms_select_authenticated on public.coworking_anamnese_forms;
create policy coworking_anamnese_forms_select_authenticated
  on public.coworking_anamnese_forms for select
  to authenticated
  using (true);

drop policy if exists coworking_anamnese_forms_insert_admin on public.coworking_anamnese_forms;
create policy coworking_anamnese_forms_insert_admin
  on public.coworking_anamnese_forms for insert
  to authenticated
  with check (public.is_admin());

-- preenchimento/assinatura pelo visitante acontece via link público — sem
-- policy de update aqui de propósito, igual anamnese_forms.
