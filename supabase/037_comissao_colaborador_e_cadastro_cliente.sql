-- Comissão fixa por colaborador (editável só por Admin, na tela /comissoes)
-- — null mantém a regra automática por unidade/origem do cliente já usada
-- em commissionRate() (lib/commission.ts).
alter table public.profiles
  add column if not exists commission_rate numeric(4, 3);

-- Endereço e e-mail no cadastro de cliente (opcionais); aniversário passa a
-- ser obrigatório só na tela de cadastro manual (validado em
-- app/actions/clients.ts) — não vira NOT NULL aqui pra não quebrar
-- cadastros antigos e a importação em massa via CSV.
alter table public.clients
  add column if not exists address text,
  add column if not exists email text;
