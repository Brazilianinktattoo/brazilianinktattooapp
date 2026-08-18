-- Brazilian Ink Tattoo — preenchimento automático + assinatura digital do
-- contrato de curso. Rode depois do supabase/012_cursos.sql.

-- 1. Dados pessoais adicionais na Ficha de Inscrição, necessários pra
-- preencher automaticamente o contrato (RG, endereço, estado).
alter table public.course_enrollments
  add column if not exists rg text not null default '',
  add column if not exists address text not null default '',
  add column if not exists state text not null default '';

-- 2. Assinatura digital do contrato: token público de acesso ao link de
-- assinatura (independente do token da ficha de inscrição) + registro de
-- quem assinou e quando.
alter table public.course_contracts
  add column if not exists sign_token uuid not null default gen_random_uuid() unique,
  add column if not exists signed_at timestamptz,
  add column if not exists signer_name text;
