-- Brazilian Ink Tattoo — Etapa 1: cadastro de acesso e permissões
-- Rode este arquivo inteiro no SQL Editor do seu projeto Supabase
-- (Supabase Dashboard > SQL Editor > New query > colar > Run).

-- 1. Papéis de acesso -------------------------------------------------------

do $$ begin
  create type public.user_role as enum ('admin', 'tatuador', 'piercer');
exception
  when duplicate_object then null;
end $$;

-- 2. Tabela de perfis (estende auth.users) -----------------------------------
-- Toda a lógica de permissão do app se baseia nesta tabela.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  -- espelhado de auth.users no momento da criação, só para exibição na
  -- tela de Colaboradores; a fonte da verdade do login continua auth.users
  email text not null default '',
  role public.user_role not null default 'tatuador',
  -- colaborador pode ser desativado (soft delete) sem perder histórico
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Perfil e nível de acesso de cada colaborador do estúdio.';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 3. Criação automática de perfil ao criar um usuário -------------------------
-- O admin cria o login do colaborador (ver app/actions/collaborators.ts), que
-- por sua vez cria o registro em auth.users com full_name/role em user_metadata.
-- Este trigger espelha esses dados em public.profiles.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, ''),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'tatuador')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Helper de permissão (evita recursão de RLS) ------------------------------

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and active
  );
$$;

-- 5. Row Level Security --------------------------------------------------------

alter table public.profiles enable row level security;

-- qualquer colaborador logado pode ver a lista de perfis
-- (necessário para a agenda mostrar nomes de tatuador/piercer)
drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated
  on public.profiles for select
  to authenticated
  using (true);

-- só admin cria/edita/desativa colaboradores (via tela de Colaboradores)
drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- inserts só acontecem via trigger (security definer) ou service role;
-- nenhuma policy de insert é criada de propósito, bloqueando insert direto
-- de clientes autenticados.

-- 6. Tornar o primeiro usuário admin -------------------------------------------
-- Depois de criar sua própria conta (ver README, passo "Primeiro admin"),
-- rode substituindo o e-mail abaixo:
--
-- update public.profiles set role = 'admin'
-- where id = (select id from auth.users where email = 'seu-email@exemplo.com');
