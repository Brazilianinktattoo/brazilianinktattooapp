-- Brazilian Ink Tattoo — módulo de Cursos (admin-only por enquanto)
-- Rode depois do supabase/011b_coworking.sql. Tudo aqui é tipo/tabela novo,
-- então não precisa de Run isolado (a restrição de "novo valor de enum na
-- mesma transação" só vale pra ALTER TYPE ... ADD VALUE em tipo existente).

-- 1. Tipos -----------------------------------------------------------------

create type public.course_type as enum (
  'tatuagem_iniciante',
  'tatuagem_especializacao',
  'piercing_iniciante',
  'piercing_especializacao'
);

-- "confirmado" não é persistido: é derivado em lib/cursos.ts a partir de
-- status='inscrito' + signed_up_at > 7 dias, pra não precisar de job
-- agendado só pra virar o status quando o prazo passa.
create type public.enrollment_status as enum (
  'inscrito',
  'lista_espera',
  'convocado',
  'matriculado',
  'desistente'
);

create type public.course_payment_type as enum ('sinal', 'final');

-- 2. Turmas ------------------------------------------------------------------
-- Cada uma das 4 "pastas" de curso pode ter várias turmas (ex: "Turma
-- Setembro/2026"), cada uma com suas próprias vagas e lista de espera.

create table public.course_classes (
  id uuid primary key default gen_random_uuid(),
  course_type public.course_type not null,
  name text not null,
  start_date date,
  max_seats int not null check (max_seats > 0),
  price_total numeric(10, 2) not null check (price_total >= 0),
  deposit_percentage numeric(5, 2) not null default 15
    check (deposit_percentage > 0 and deposit_percentage <= 100),
  active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index course_classes_type_idx on public.course_classes (course_type, active);

drop trigger if exists set_course_classes_updated_at on public.course_classes;
create trigger set_course_classes_updated_at
  before update on public.course_classes
  for each row execute function public.set_updated_at();

alter table public.course_classes enable row level security;

drop policy if exists course_classes_admin on public.course_classes;
create policy course_classes_admin
  on public.course_classes for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 3. Links de inscrição --------------------------------------------------------
-- Gerados pelo admin/recepção pra mandar ao lead. O lead nunca loga —
-- a validação do token e o insert da inscrição usam service_role
-- (ver app/actions/cursos.ts), então não existe policy de leitura anônima.

create table public.course_signup_links (
  id uuid primary key default gen_random_uuid(),
  course_class_id uuid not null references public.course_classes (id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  used_at timestamptz
);

alter table public.course_signup_links enable row level security;

drop policy if exists course_signup_links_admin on public.course_signup_links;
create policy course_signup_links_admin
  on public.course_signup_links for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 4. Inscrições (Ficha de Inscrição) -------------------------------------------

create table public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  course_class_id uuid not null references public.course_classes (id) on delete cascade,
  signup_link_id uuid references public.course_signup_links (id),
  full_name text not null,
  email text not null,
  phone text not null,
  cpf text not null default '',
  status public.enrollment_status not null default 'inscrito',
  -- só usado enquanto status = 'lista_espera', pra manter ordem de chegada
  waitlist_position int,
  signed_up_at timestamptz not null default now(),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index course_enrollments_class_idx
  on public.course_enrollments (course_class_id, status);

alter table public.course_signup_links
  add column if not exists enrollment_id uuid references public.course_enrollments (id);

drop trigger if exists set_course_enrollments_updated_at on public.course_enrollments;
create trigger set_course_enrollments_updated_at
  before update on public.course_enrollments
  for each row execute function public.set_updated_at();

alter table public.course_enrollments enable row level security;

drop policy if exists course_enrollments_admin on public.course_enrollments;
create policy course_enrollments_admin
  on public.course_enrollments for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 5. Controle de Pagamento -------------------------------------------------------

create table public.course_payments (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.course_enrollments (id) on delete cascade,
  type public.course_payment_type not null,
  amount numeric(10, 2) not null check (amount >= 0),
  paid_at timestamptz not null default now(),
  notes text not null default '',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index course_payments_enrollment_idx on public.course_payments (enrollment_id);

alter table public.course_payments enable row level security;

drop policy if exists course_payments_admin on public.course_payments;
create policy course_payments_admin
  on public.course_payments for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 6. Contrato -----------------------------------------------------------------

create table public.course_contracts (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null unique references public.course_enrollments (id) on delete cascade,
  content text not null default '',
  file_path text,
  signed boolean not null default false,
  generated_at timestamptz,
  uploaded_at timestamptz,
  updated_at timestamptz not null default now()
);

drop trigger if exists set_course_contracts_updated_at on public.course_contracts;
create trigger set_course_contracts_updated_at
  before update on public.course_contracts
  for each row execute function public.set_updated_at();

alter table public.course_contracts enable row level security;

drop policy if exists course_contracts_admin on public.course_contracts;
create policy course_contracts_admin
  on public.course_contracts for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 7. Storage: anexo do contrato assinado ---------------------------------------

insert into storage.buckets (id, name, public)
values ('contratos', 'contratos', false)
on conflict (id) do nothing;

drop policy if exists contratos_admin_all on storage.objects;
create policy contratos_admin_all
  on storage.objects for all
  to authenticated
  using (bucket_id = 'contratos' and public.is_admin())
  with check (bucket_id = 'contratos' and public.is_admin());

-- 8. Lista de espera: promoção automática ao desistir --------------------------
-- Quando uma inscrição que ocupava vaga (inscrito/matriculado/convocado) vira
-- 'desistente', chama o próximo da lista de espera daquela turma (ordem de
-- chegada) pra 'convocado' e avisa todo admin ativo via notificação in-app —
-- não existe envio de e-mail/SMS no projeto ainda, então quem entra em
-- contato com o lead é a equipe, a partir do aviso.

create or replace function public.promote_course_waitlist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_id uuid;
  next_name text;
  next_contact text;
  class_name text;
  admin_id uuid;
begin
  if new.status = 'desistente'
     and old.status in ('inscrito', 'matriculado', 'convocado')
  then
    select id, full_name, coalesce(nullif(phone, ''), email)
      into next_id, next_name, next_contact
    from public.course_enrollments
    where course_class_id = new.course_class_id
      and status = 'lista_espera'
    order by waitlist_position asc nulls last, signed_up_at asc
    limit 1;

    if next_id is not null then
      update public.course_enrollments
      set status = 'convocado', waitlist_position = null
      where id = next_id;

      select name into class_name
      from public.course_classes where id = new.course_class_id;

      for admin_id in select id from public.profiles where role = 'admin' and active loop
        insert into public.notifications (profile_id, message)
        values (
          admin_id,
          'Vaga liberada em "' || coalesce(class_name, 'turma') || '": próximo da lista de espera é ' ||
          next_name || ' (' || next_contact || '). Entre em contato para confirmar a matrícula.'
        );
      end loop;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists promote_course_waitlist_trigger on public.course_enrollments;
create trigger promote_course_waitlist_trigger
  after update on public.course_enrollments
  for each row execute function public.promote_course_waitlist();
