-- Libera Chefe de Piercing e Body Piercer pra ver/enviar/organizar
-- documentos numa pasta específica do arquivo (ex: "Lobuloplastia") — o
-- resto do arquivo (financeiro, contratos, etc.) continua exclusivo do
-- admin. piercing_accessible marca a pasta raiz liberada; qualquer
-- subpasta dentro dela também fica visível (checagem recursiva pelo
-- parent_id), sem precisar marcar cada uma individualmente.

alter table public.document_folders
  add column if not exists piercing_accessible boolean not null default false;

create or replace function public.is_piercing_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('piercer', 'chefe_piercing') and active
  );
$$;

create or replace function public.is_piercing_accessible_folder(target_folder_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  with recursive chain as (
    select id, parent_id, piercing_accessible
    from public.document_folders
    where id = target_folder_id
    union all
    select f.id, f.parent_id, f.piercing_accessible
    from public.document_folders f
    join chain c on f.id = c.parent_id
  )
  select exists (select 1 from chain where piercing_accessible);
$$;

-- document_folders: além do admin (document_folders_admin_all, já
-- existente), staff de piercing vê/cria/renomeia dentro da área liberada.
-- Exclusão continua só admin.
drop policy if exists document_folders_select_piercing_staff on public.document_folders;
create policy document_folders_select_piercing_staff
  on public.document_folders for select
  to authenticated
  using (public.is_piercing_staff() and public.is_piercing_accessible_folder(id));

drop policy if exists document_folders_insert_piercing_staff on public.document_folders;
create policy document_folders_insert_piercing_staff
  on public.document_folders for insert
  to authenticated
  with check (
    public.is_piercing_staff()
    and parent_id is not null
    and public.is_piercing_accessible_folder(parent_id)
  );

drop policy if exists document_folders_update_piercing_staff on public.document_folders;
create policy document_folders_update_piercing_staff
  on public.document_folders for update
  to authenticated
  using (public.is_piercing_staff() and public.is_piercing_accessible_folder(id))
  with check (public.is_piercing_staff() and public.is_piercing_accessible_folder(id));

-- document_files: mesma ideia, escopado pelo folder_id.
drop policy if exists document_files_select_piercing_staff on public.document_files;
create policy document_files_select_piercing_staff
  on public.document_files for select
  to authenticated
  using (public.is_piercing_staff() and public.is_piercing_accessible_folder(folder_id));

drop policy if exists document_files_insert_piercing_staff on public.document_files;
create policy document_files_insert_piercing_staff
  on public.document_files for insert
  to authenticated
  with check (public.is_piercing_staff() and public.is_piercing_accessible_folder(folder_id));

drop policy if exists document_files_update_piercing_staff on public.document_files;
create policy document_files_update_piercing_staff
  on public.document_files for update
  to authenticated
  using (public.is_piercing_staff() and public.is_piercing_accessible_folder(folder_id))
  with check (public.is_piercing_staff() and public.is_piercing_accessible_folder(folder_id));

-- Pasta raiz liberada pra piercing — os 3 documentos de lobuloplastia vão
-- aqui dentro.
insert into public.document_folders (name, parent_id, piercing_accessible)
values ('Lobuloplastia', null, true)
on conflict (name) where parent_id is null
do update set piercing_accessible = true;
