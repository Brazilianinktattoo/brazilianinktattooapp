-- Brazilian Ink Tattoo — valor total e valor do sinal na ficha de anamnese.
-- Rode depois do supabase/024_whatsapp_automation.sql.
--
-- Aceitam 0 (sem sinal), mas passam a ser preenchidos sempre — a
-- obrigatoriedade real (não deixar em branco) é aplicada na action de
-- assinatura (app/actions/anamnese.ts), aqui só garante not null.

alter table public.anamnese_forms
  add column if not exists total_amount numeric(10, 2) not null default 0;

alter table public.anamnese_forms
  add column if not exists deposit_amount numeric(10, 2) not null default 0;
