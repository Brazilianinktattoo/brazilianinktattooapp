-- Aba de documentos digitalizados/arquivados — acesso exclusivo de Admin.
-- Reaproveita o bucket 'documentos' já existente (privado, só admin via
-- storage.objects RLS — ver 020_documentos_storage.sql), com um prefixo
-- próprio ("arquivo/...") pros arquivos dessa feature.

create table if not exists public.document_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references public.document_folders (id) on delete restrict,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.document_folders is 'Pastas/subpastas do arquivo de documentos digitalizados (admin).';

-- unique(parent_id, name) não funciona pra pastas de raiz porque NULL não
-- é igual a NULL num constraint normal — dois índices parciais cobrem os
-- dois casos (raiz vs. dentro de uma pasta) corretamente.
create unique index if not exists document_folders_root_name_key
  on public.document_folders (name) where parent_id is null;
create unique index if not exists document_folders_child_name_key
  on public.document_folders (parent_id, name) where parent_id is not null;

drop trigger if exists set_document_folders_updated_at on public.document_folders;
create trigger set_document_folders_updated_at
  before update on public.document_folders
  for each row execute function public.set_updated_at();

create table if not exists public.document_files (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.document_folders (id) on delete restrict,
  name text not null,
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.document_files is 'Arquivos dentro de uma pasta do arquivo de documentos digitalizados (admin).';

drop trigger if exists set_document_files_updated_at on public.document_files;
create trigger set_document_files_updated_at
  before update on public.document_files
  for each row execute function public.set_updated_at();

alter table public.document_folders enable row level security;
alter table public.document_files enable row level security;

drop policy if exists document_folders_admin_all on public.document_folders;
create policy document_folders_admin_all
  on public.document_folders for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists document_files_admin_all on public.document_files;
create policy document_files_admin_all
  on public.document_files for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Categorias de partida sugeridas — Admin pode criar mais subpastas livremente.
insert into public.document_folders (name, parent_id)
values
  ('Ficha de Anamnese Manual', null),
  ('Carteira de Identidade', null),
  ('Notas Fiscais', null),
  ('Contratos', null),
  ('Outros', null)
on conflict (name) where parent_id is null do nothing;
