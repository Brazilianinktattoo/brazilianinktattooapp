-- Brazilian Ink Tattoo — Ficha de Anamnese de Piercing, baseada fielmente
-- no modelo enviado (Ficha_Anamnese_Alunos_BIT.docx, renomeado pelo
-- estúdio pra "Ficha de Anamnese de Piercing"). Rode depois do
-- supabase/029_colaborador_aniversario.sql.
--
-- Diferente da ficha padrão (não fica presa a um appointment): a seção
-- "ESPAÇO EXCLUSIVO DO ESTÚDIO" (local, tipo, aluno responsável, valor) é
-- preenchida pelo admin ao gerar o link; o cliente só preenche
-- identificação + saúde + assinatura.

create table if not exists public.student_anamnese_forms (
  id uuid primary key default gen_random_uuid(),

  -- preenchido pelo estúdio ao gerar a ficha
  student_name text not null default '',
  procedure_location text not null default '',
  procedure_type text not null default '',
  notes text not null default '',
  value numeric(10, 2) not null default 0,

  -- preenchido pelo cliente ao assinar
  full_name text not null default '',
  rg text not null default '',
  cpf text not null default '',
  birth_date date,
  address text not null default '',
  cep text not null default '',
  city text not null default '',
  email text not null default '',
  whatsapp text not null default '',
  client_origin text not null default '',
  blood_type text not null default '',
  health_declaration jsonb not null default '{}'::jsonb,
  photo_authorization boolean not null default false,

  file_path text,
  sign_token uuid not null default gen_random_uuid() unique,
  signed_at timestamptz,
  signer_name text,

  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_student_anamnese_forms_updated_at on public.student_anamnese_forms;
create trigger set_student_anamnese_forms_updated_at
  before update on public.student_anamnese_forms
  for each row execute function public.set_updated_at();

alter table public.student_anamnese_forms enable row level security;

drop policy if exists student_anamnese_forms_select_authenticated on public.student_anamnese_forms;
create policy student_anamnese_forms_select_authenticated
  on public.student_anamnese_forms for select
  to authenticated
  using (true);

-- Tatuadores também geram e enviam essa ficha (não só admin) — edição dos
-- textos fixos continua exclusiva do admin (RLS de form_texts).
drop policy if exists student_anamnese_forms_insert_admin_or_tatuador on public.student_anamnese_forms;
create policy student_anamnese_forms_insert_admin_or_tatuador
  on public.student_anamnese_forms for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'tatuador')
    )
  );

-- consentimento (com autorização de uso de imagem) editável pelo admin,
-- igual ao resto dos textos fixos de ficha.
insert into public.form_texts (key, label, body) values
  (
    'student_anamnese_consent',
    'Ficha de Anamnese de Piercing — texto de consentimento',
    'Declaro que as informações acima são verdadeiras, não cabendo ao profissional quaisquer responsabilidades por informações omitidas nessa avaliação. Declaro ser de minha espontânea vontade a realização da tatuagem/piercing no local aqui descrito. Estou ciente de que o procedimento é de caráter permanente (quando aplicável) e das dificuldades de uma remoção. Comprometo-me a seguir todos os cuidados necessários após o procedimento.'
  ),
  (
    'student_anamnese_photo_authorization',
    'Ficha de Anamnese de Piercing — autorização de uso de imagem',
    'Autorizo o registro fotográfico do trabalho realizado (antes/depois) para efeitos de documentação e divulgação em redes sociais ou qualquer material publicitário. A presente autorização é concedida gratuitamente, sem que nada haja a ser reclamado a título ou qualquer outro.'
  )
on conflict (key) do nothing;
