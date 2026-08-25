-- A tabela collaborator_exception_passes (criada em 045) ficou sem uso
-- depois que 046 removeu a restrição de domingo/horário por completo — não
-- existe mais nada pra "liberar" por exceção.

drop policy if exists "collaborator_exception_passes_admin_all" on public.collaborator_exception_passes;
drop policy if exists "collaborator_exception_passes_self_select" on public.collaborator_exception_passes;
drop table if exists public.collaborator_exception_passes;
