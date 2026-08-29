-- Ficha digital de Lobuloplastia — mesmo padrão de anamnese_forms (link
-- público, cliente assina, PDF gerado), mas tabela própria porque o
-- conteúdo é bem diferente (perguntas de saúde específicas, sem
-- procedure_type/valores) e porque, ao contrário da ficha normal, esse
-- registro continua vivo depois da assinatura: a equipe volta em cada
-- retorno (ao longo de meses) pra registrar sessão e evolução.

create table if not exists public.lobuloplastia_forms (
  id uuid primary key default gen_random_uuid(),
  collaborator_id uuid references public.profiles (id),
  full_name text not null,
  birth_date date,
  cpf text,
  rg text,
  phone text not null,
  social_media text,
  address text,
  cep text,
  city text,
  health_declaration jsonb not null default '{}'::jsonb,
  fenda_description text not null default '',
  image_authorization boolean not null default false,
  sign_token uuid not null default gen_random_uuid() unique,
  signed_at timestamptz,
  signer_name text,
  file_path text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_lobuloplastia_forms_updated_at on public.lobuloplastia_forms;
create trigger set_lobuloplastia_forms_updated_at
  before update on public.lobuloplastia_forms
  for each row execute function public.set_updated_at();

-- Sessões (data + descrição, sem limite de quantas) e notas de evolução
-- do procedimento — registro que cresce ao longo do acompanhamento,
-- separado do documento assinado (que fica imutável).
create table if not exists public.lobuloplastia_entries (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.lobuloplastia_forms (id) on delete cascade,
  kind text not null check (kind in ('sessao', 'evolucao')),
  session_number smallint,
  description text,
  entry_date date,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists lobuloplastia_entries_form_id_idx
  on public.lobuloplastia_entries (form_id, created_at);

alter table public.lobuloplastia_forms enable row level security;
alter table public.lobuloplastia_entries enable row level security;

-- Só admin e staff de piercing (is_piercing_staff, já existe desde a
-- migração 060) veem/criam/editam — não existe policy de update pro
-- cliente de propósito: a assinatura acontece via link público, usando o
-- client admin/service role no server action (mesmo padrão de
-- anamnese_forms, ver 019_anamnese.sql).
drop policy if exists lobuloplastia_forms_all_staff on public.lobuloplastia_forms;
create policy lobuloplastia_forms_all_staff
  on public.lobuloplastia_forms for all
  to authenticated
  using (public.is_admin() or public.is_piercing_staff())
  with check (public.is_admin() or public.is_piercing_staff());

drop policy if exists lobuloplastia_entries_all_staff on public.lobuloplastia_entries;
create policy lobuloplastia_entries_all_staff
  on public.lobuloplastia_entries for all
  to authenticated
  using (public.is_admin() or public.is_piercing_staff())
  with check (public.is_admin() or public.is_piercing_staff());
