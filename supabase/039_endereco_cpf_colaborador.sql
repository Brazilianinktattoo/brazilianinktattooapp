-- Endereço e CPF no cadastro de colaboradores (opcionais).
alter table public.profiles
  add column if not exists address text,
  add column if not exists cpf text;
