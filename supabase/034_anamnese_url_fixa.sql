-- Brazilian Ink Tattoo — Ficha de Anamnese BIT com URL fixa (pra QR Code
-- permanente): o cliente escolhe o profissional numa lista suspensa em
-- vez da ficha ser pré-vinculada a um agendamento. appointment_id vira
-- opcional (o fluxo por agendamento continua existindo do jeito que
-- estava); collaborator_id guarda o profissional escolhido nesse fluxo
-- novo. qr_anamnese_enabled controla quem aparece nessa lista — só Admin
-- edita.
-- Rode depois do supabase/033_cliente_cadastrado_por.sql.

alter table public.anamnese_forms
  alter column appointment_id drop not null;

alter table public.anamnese_forms
  add column if not exists collaborator_id uuid references public.profiles (id);

alter table public.profiles
  add column if not exists qr_anamnese_enabled boolean not null default false;

-- inserir uma ficha sem agendamento (fluxo QR) é sempre feito com service
-- role a partir da action pública — nenhuma policy de insert extra
-- necessária. Read (select) já é liberado a authenticated.
