-- Brazilian Ink Tattoo — Fase 8: bucket de storage pra PDFs arquivados
-- (ficha de anamnese, autorização de menores, ficha de coworking, recibo de
-- curso). Rode depois do supabase/019_anamnese.sql.
--
-- Mesmo padrão do bucket 'contratos' (012_cursos.sql): privado, só admin lê
-- direto — o acesso de quem não é admin acontece via link assinado gerado
-- pelo client de service role no server action, não pela RLS daqui.

insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

drop policy if exists documentos_admin_all on storage.objects;
create policy documentos_admin_all
  on storage.objects for all
  to authenticated
  using (bucket_id = 'documentos' and public.is_admin())
  with check (bucket_id = 'documentos' and public.is_admin());
