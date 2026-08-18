-- Brazilian Ink Tattoo — Fase 8: ficha de anamnese (cliente do estúdio)
-- Rode depois do supabase/018_joias.sql.
--
-- Uma ficha por agendamento, com link público de preenchimento/assinatura
-- (mesmo padrão de token usado no contrato de curso). Baseada no modelo real
-- Ficha_Anamnese_BIT_Completa_RJ.docx — identificação, tipo de procedimento,
-- declaração de saúde e consentimento, unificada tatuagem+piercing.
--
-- client_origin é a "primeira pergunta" do prompt original e define a regra
-- de comissão. is_minor dispara a Autorização de Piercing para Menores.

create table if not exists public.anamnese_forms (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments (id) on delete cascade,

  full_name text not null default '',
  birth_date date,
  cpf text not null default '',
  rg text not null default '',
  address text not null default '',
  cep text not null default '',
  phone text not null default '',
  email text not null default '',
  is_minor boolean,

  procedure_type text check (procedure_type in ('tatuagem', 'piercing', 'ambos')),
  procedure_description text not null default '',
  body_location text not null default '',

  -- declaração de saúde: perguntas sim/não + detalhe, guardadas como objeto
  -- (não precisa de coluna própria por pergunta — é só arquivamento legal).
  health_declaration jsonb not null default '{}'::jsonb,

  client_origin text
    check (client_origin in ('trazido_pelo_tatuador', 'indicado_pelo_estudio', 'barra_shopping')),

  file_path text,
  sign_token uuid not null default gen_random_uuid() unique,
  signed_at timestamptz,
  signer_name text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_anamnese_forms_updated_at on public.anamnese_forms;
create trigger set_anamnese_forms_updated_at
  before update on public.anamnese_forms
  for each row execute function public.set_updated_at();

alter table public.anamnese_forms enable row level security;

drop policy if exists anamnese_forms_select_authenticated on public.anamnese_forms;
create policy anamnese_forms_select_authenticated
  on public.anamnese_forms for select
  to authenticated
  using (true);

-- geração da ficha (criar a linha + token) pelo próprio colaborador do
-- agendamento ou admin — igual padrão de abertura de comanda.
drop policy if exists anamnese_forms_insert_own_or_admin on public.anamnese_forms;
create policy anamnese_forms_insert_own_or_admin
  on public.anamnese_forms for insert
  to authenticated
  with check (
    public.is_admin() or exists (
      select 1 from public.appointments a
      where a.id = appointment_id and a.collaborator_id = auth.uid()
    )
  );

-- preenchimento/assinatura pelo cliente acontece via link público, sem
-- login — a action correspondente usa o client admin (service role) e
-- valida posse do token, então não existe policy de update aqui de propósito.
