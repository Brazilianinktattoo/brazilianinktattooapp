-- Brazilian Ink Tattoo — Fase 2: controle de sinal do agendamento
-- Rode depois do supabase/002_agenda.sql, no mesmo SQL Editor.
--
-- Nota sobre macas: o estúdio tem 6 macas físicas, mas só as 5 cadastradas
-- em public.macas (Maca 1 a 5) entram no sistema de agendamento — a Maca 6
-- é reservada para clientes de porta e fica de fora de propósito. Não é
-- preciso nenhuma alteração de schema para isso: basta nunca cadastrá-la em
-- public.macas.

alter table public.appointments
  add column if not exists deposit_amount numeric(10, 2) not null default 0,
  add column if not exists deposit_status text not null default 'pendente'
    check (deposit_status in ('pago', 'pendente'));
