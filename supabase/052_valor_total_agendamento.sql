-- Valor total do procedimento, separado do sinal — hoje o agendamento só
-- guardava o sinal, sem saber o valor combinado do serviço.
alter table public.appointments
  add column if not exists total_amount numeric(10, 2) not null default 0;
