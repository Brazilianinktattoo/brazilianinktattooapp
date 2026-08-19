-- Brazilian Ink Tattoo — textos fixos (parágrafos de consentimento) das
-- fichas públicas, editáveis pelo Admin sem precisar mexer em código.
-- Rode depois do supabase/027_contas_fixas.sql.

create table if not exists public.form_texts (
  key text primary key,
  label text not null,
  body text not null default '',
  updated_at timestamptz not null default now()
);

drop trigger if exists set_form_texts_updated_at on public.form_texts;
create trigger set_form_texts_updated_at
  before update on public.form_texts
  for each row execute function public.set_updated_at();

alter table public.form_texts enable row level security;

drop policy if exists form_texts_admin_only on public.form_texts;
create policy form_texts_admin_only
  on public.form_texts for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into public.form_texts (key, label, body) values
  (
    'anamnese_bit_consent',
    'Ficha de Anamnese BIT — texto de consentimento',
    'Declaro estar ciente de que o procedimento envolve o rompimento da barreira natural da pele, com riscos inerentes de dor, edema, hematoma, sangramento, reação alérgica e infecção. Fui informado(a) sobre os cuidados pós-procedimento necessários e sobre a dificuldade do processo de remoção, quando aplicável. Declaro que as informações de saúde acima são verdadeiras e completas.'
  ),
  (
    'minor_authorization_consent',
    'Autorização de Piercing para Menores — texto de consentimento',
    'Declaro serem verdadeiras as afirmações acima e assumo total responsabilidade por qualquer omissão ou erro nas mesmas.'
  )
on conflict (key) do nothing;
