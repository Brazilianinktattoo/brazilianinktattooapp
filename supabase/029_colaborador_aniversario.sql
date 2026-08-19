-- Brazilian Ink Tattoo — aniversário do colaborador, pro dashboard do
-- admin conseguir listar aniversariantes do dia (colaboradores + clientes).
-- Rode depois do supabase/028_form_texts.sql.

alter table public.profiles
  add column if not exists birthday date;
