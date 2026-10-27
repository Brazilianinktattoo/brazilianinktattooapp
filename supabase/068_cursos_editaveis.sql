-- Cursos viram uma lista editável (antes era um enum fixo de 4 valores).
-- O "slug" mantém os valores antigos (turmas e contratos existentes seguem
-- apontando pra eles); o nome de exibição é editável.

create table if not exists public.courses (
  slug text primary key,
  name text not null,
  area text not null default 'tatuagem' check (area in ('tatuagem', 'piercing')),
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

insert into public.courses (slug, name, area, sort_order) values
  ('tatuagem_iniciante', 'Tatuagem para Iniciantes', 'tatuagem', 10),
  ('tatuagem_iniciante_individual', 'Tatuagem para Iniciantes Individual', 'tatuagem', 12),
  ('tatuagem_iniciante_intensivo', 'Tatuagem para Iniciantes Intensivo', 'tatuagem', 14),
  ('tatuagem_especializacao', 'Tatuagem Especialização', 'tatuagem', 20),
  ('tatuagem_destrava', 'Tatuagem Destrava', 'tatuagem', 30),
  ('piercing_iniciante', 'Piercing para Iniciantes', 'piercing', 40),
  ('piercing_especializacao', 'Piercing Avançado', 'piercing', 50)
on conflict (slug) do nothing;

alter table public.courses enable row level security;
drop policy if exists courses_admin on public.courses;
create policy courses_admin on public.courses for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.course_classes alter column course_type type text using course_type::text;
alter table public.course_classes
  add constraint course_classes_course_type_fkey
  foreign key (course_type) references public.courses (slug);
