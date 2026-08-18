-- Brazilian Ink Tattoo — Fase 8: recibo de pagamento do curso
-- Rode depois do supabase/022_coworking_anamnese.sql.
--
-- Um recibo por pagamento (course_payments — sinal ou matrícula). Diferente
-- dos outros documentos dessa fase, o recibo não é assinado pelo aluno (quem
-- "assina" é o próprio estúdio, conforme o modelo) — o link público é só
-- pra visualização/download do PDF já gerado pelo admin.

create table if not exists public.course_receipts (
  id uuid primary key default gen_random_uuid(),
  course_payment_id uuid not null unique references public.course_payments (id) on delete cascade,
  file_path text,
  access_token uuid not null default gen_random_uuid() unique,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.course_receipts enable row level security;

drop policy if exists course_receipts_select_authenticated on public.course_receipts;
create policy course_receipts_select_authenticated
  on public.course_receipts for select
  to authenticated
  using (true);

drop policy if exists course_receipts_insert_admin on public.course_receipts;
create policy course_receipts_insert_admin
  on public.course_receipts for insert
  to authenticated
  with check (public.is_admin());
