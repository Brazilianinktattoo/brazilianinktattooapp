-- Brazilian Ink Tattoo — Admin passa a poder ter atendimentos próprios
-- (tratado como tatuador pra fins de maca/comissão/categoria) e Chefe de
-- Piercing passa a poder ter atendimentos próprios (tratado como body
-- piercer). Puramente aditivo — nenhuma permissão existente é removida.
-- Rode depois do supabase/031_taxa_acrescida_e_comissao.sql.

-- 1) Trigger de agendamento: admin agora exige maca (como tatuador);
--    chefe_piercing agora É PROIBIDO de ter maca (como body piercer).
create or replace function public.enforce_appointment_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  collaborator_role public.user_role;
  maca_unit_id uuid;
  pass_maca_id uuid;
  pass_unit_id uuid;
  pass_starts timestamptz;
  pass_ends timestamptz;
begin
  select role into collaborator_role
  from public.profiles
  where id = new.collaborator_id;

  if collaborator_role in ('piercer', 'chefe_piercing') and new.maca_id is not null then
    raise exception 'Body piercer nao utiliza maca.';
  end if;

  if collaborator_role in ('tatuador', 'admin') and new.maca_id is null then
    raise exception 'Tatuador precisa escolher uma maca.';
  end if;

  if collaborator_role = 'visitante' then
    select maca_id, unit_id, starts_at, ends_at
      into pass_maca_id, pass_unit_id, pass_starts, pass_ends
    from public.coworking_passes
    where profile_id = new.collaborator_id
    order by created_at desc
    limit 1;

    if pass_maca_id is null or now() < pass_starts or now() > pass_ends then
      raise exception 'Acesso de coworking expirado ou nao encontrado.';
    end if;

    if new.starts_at < pass_starts or new.ends_at > pass_ends then
      raise exception 'Horario fora do periodo reservado para este acesso.';
    end if;

    new.maca_id := pass_maca_id;
    new.unit_id := pass_unit_id;
  end if;

  if new.maca_id is not null then
    select unit_id into maca_unit_id from public.macas where id = new.maca_id;
    if maca_unit_id is distinct from new.unit_id then
      raise exception 'A maca escolhida nao pertence a unidade selecionada.';
    end if;
  end if;

  return new;
end;
$$;

-- 2) RLS: Chefe de Piercing enxergava só linhas de colaborador com
--    role='piercer' — agora precisa ver as próprias (role='chefe_piercing')
--    também. Admin já enxerga tudo via appointments_select_others /
--    comandas_select_others (is_admin não entra nessas checagens porque
--    elas só restringem chefe_piercing/visitante).

drop policy if exists appointments_select_chefe_piercing on public.appointments;
create policy appointments_select_chefe_piercing
  on public.appointments for select
  to authenticated
  using (
    public.is_chefe_piercing() and exists (
      select 1 from public.profiles p
      where p.id = collaborator_id and p.role in ('piercer', 'chefe_piercing')
    )
  );

drop policy if exists comandas_select_chefe_piercing on public.comandas;
create policy comandas_select_chefe_piercing
  on public.comandas for select
  to authenticated
  using (
    public.is_chefe_piercing() and exists (
      select 1 from public.profiles p
      where p.id = collaborator_id and p.role in ('piercer', 'chefe_piercing')
    )
  );

drop policy if exists comanda_services_select_chefe_piercing on public.comanda_services;
create policy comanda_services_select_chefe_piercing
  on public.comanda_services for select
  to authenticated
  using (
    public.is_chefe_piercing() and exists (
      select 1 from public.comandas c
      join public.profiles p on p.id = c.collaborator_id
      where c.id = comanda_id and p.role in ('piercer', 'chefe_piercing')
    )
  );

drop policy if exists comanda_products_select_chefe_piercing on public.comanda_products;
create policy comanda_products_select_chefe_piercing
  on public.comanda_products for select
  to authenticated
  using (
    public.is_chefe_piercing() and exists (
      select 1 from public.comandas c
      join public.profiles p on p.id = c.collaborator_id
      where c.id = comanda_id and p.role in ('piercer', 'chefe_piercing')
    )
  );

-- 3) Mensagem automática pós-tattoo (cuidados 1/7/15/30/60 dias) também
--    passa a disparar pra tatuagens feitas pelo admin, não só por tatuador
--    — senão o cliente do admin fica sem receber os avisos de cuidado.
create or replace function public.generate_due_messages()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'America/Sao_Paulo')::date;
  tpl record;
  days_map jsonb := '{"pos_tattoo_1":1,"pos_tattoo_7":7,"pos_tattoo_15":15,"pos_tattoo_30":30,"pos_tattoo_60":60}';
  offset_days int;
begin
  -- aniversário
  select * into tpl from public.message_templates where trigger = 'aniversario' and active;
  if found then
    insert into public.message_queue (client_id, kind, body, scheduled_for)
    select c.id, 'aniversario',
      replace(tpl.body, '{{nome}}', split_part(c.full_name, ' ', 1)),
      today
    from public.clients c
    where c.birthday is not null
      and extract(month from c.birthday) = extract(month from today)
      and extract(day from c.birthday) = extract(day from today)
    on conflict do nothing;
  end if;

  -- pós-tattoo (1/7/15/30/60 dias após o fechamento da comanda, só tatuagem)
  for tpl in
    select * from public.message_templates
    where trigger in ('pos_tattoo_1', 'pos_tattoo_7', 'pos_tattoo_15', 'pos_tattoo_30', 'pos_tattoo_60')
      and active
  loop
    offset_days := (days_map ->> tpl.trigger)::int;
    insert into public.message_queue (client_id, kind, comanda_id, body, scheduled_for)
    select a.client_id, tpl.trigger, cm.id,
      replace(tpl.body, '{{nome}}', split_part(a.client_name, ' ', 1)),
      today
    from public.comandas cm
    join public.appointments a on a.id = cm.appointment_id
    join public.profiles p on p.id = cm.collaborator_id
    where cm.status = 'fechada'
      and p.role in ('tatuador', 'admin')
      and a.client_id is not null
      and (cm.closed_at at time zone 'America/Sao_Paulo')::date = today - offset_days
    on conflict do nothing;
  end loop;
end;
$$;
