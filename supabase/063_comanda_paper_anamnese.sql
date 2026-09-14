-- Espaço na comanda pra subir a ficha de anamnese assinada em papel (PDF
-- ou foto/JPEG) — companion do checkbox "atendimento especial" liberado
-- agora pra tatuadores também (ver app/actions/comandas.ts). Upload em si
-- passa pelo client admin no server action (mesmo padrão do bucket
-- 'documentos' — RLS de storage é admin-only, quem pode chamar a action é
-- controlado ali, não aqui).

create table if not exists public.comanda_documents (
  id uuid primary key default gen_random_uuid(),
  comanda_id uuid not null references public.comandas (id) on delete cascade,
  file_path text not null,
  file_name text not null,
  mime_type text,
  uploaded_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists comanda_documents_comanda_id_idx
  on public.comanda_documents (comanda_id);

alter table public.comanda_documents enable row level security;

-- Mesmo padrão de comanda_services: todo autenticado vê, só admin ou o
-- próprio dono da comanda escreve — e só numa comanda ainda aberta (a
-- menos que seja admin/chefe_piercing, via check_comanda_open() já
-- existente, atualizada na migração 058).
drop policy if exists comanda_documents_select_authenticated on public.comanda_documents;
create policy comanda_documents_select_authenticated
  on public.comanda_documents for select
  to authenticated
  using (true);

drop policy if exists comanda_documents_write_own_or_admin on public.comanda_documents;
create policy comanda_documents_write_own_or_admin
  on public.comanda_documents for all
  to authenticated
  using (
    public.is_admin() or exists (
      select 1 from public.comandas c
      where c.id = comanda_id and c.collaborator_id = auth.uid()
    )
  )
  with check (
    public.is_admin() or exists (
      select 1 from public.comandas c
      where c.id = comanda_id and c.collaborator_id = auth.uid()
    )
  );

drop trigger if exists check_comanda_open_documents_trigger on public.comanda_documents;
create trigger check_comanda_open_documents_trigger
  before insert or update or delete on public.comanda_documents
  for each row execute function public.check_comanda_open();
