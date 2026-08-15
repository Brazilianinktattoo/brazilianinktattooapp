# Brazilian Ink Tattoo — Sistema de Gestão

PWA (funciona no navegador, instalável no celular e no desktop) para gestão do
estúdio.

- **Fase 1**: login por colaborador, papéis (Admin / Tatuador / Body Piercer)
  e tela de admin para gerenciar quem tem acesso.
- **Fase 2 (atual)**: agenda — criar/editar/cancelar agendamentos com maca
  (só tatuador), sem conflito de horário, controle de sinal, e o Mapa das
  macas (visão do dia por maca, só admin).

Stack: Next.js (App Router) + Tailwind + Supabase (Postgres + Auth).

## 1. Criar o projeto no Supabase

1. Crie uma conta gratuita em [supabase.com](https://supabase.com) e um novo projeto.
2. Em **Project Settings > API**, copie:
   - `Project URL`
   - `anon public` key
   - `service_role` key (secreta — só usada no servidor)
3. Em **SQL Editor**, rode em ordem os três arquivos de
   [`supabase/`](supabase/):
   1. [`schema.sql`](supabase/schema.sql) — tabela `profiles` (nome, e-mail,
      papel, ativo/inativo), gatilho que cria o perfil ao criar um login, e
      as políticas de RLS que aplicam as permissões.
   2. [`002_agenda.sql`](supabase/002_agenda.sql) — tabelas `macas` e
      `appointments`, com constraints que impedem dois agendamentos
      confirmados na mesma maca ou para o mesmo colaborador no mesmo
      horário, e um gatilho que bloqueia maca para body piercer.
   3. [`003_sinal.sql`](supabase/003_sinal.sql) — campos de sinal
      (`deposit_amount`, `deposit_status`) em `appointments`.

## 2. Configurar o projeto localmente

```bash
cp .env.local.example .env.local
```

Preencha `.env.local` com os três valores copiados do Supabase.

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). Você será redirecionado para `/login`.

## 3. Criar seu próprio acesso de admin (primeiro login)

Como ainda não existe nenhum colaborador cadastrado, crie o seu:

1. No dashboard do Supabase, vá em **Authentication > Users > Add user**,
   crie seu usuário com seu e-mail e uma senha (marque "Auto Confirm User").
2. Volte ao **SQL Editor** e rode, trocando o e-mail:
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'seu-email@exemplo.com');
   ```
3. Faça login em `http://localhost:3000/login` com esse e-mail e senha.

A partir daqui, use a tela **Colaboradores** (menu superior, só visível para
admin) para cadastrar tatuadores e body piercers — não precisa mais usar o
dashboard do Supabase para isso.

## Como funcionam as permissões

- **Admin**: vê e edita tudo — qualquer agendamento, Colaboradores, Macas e
  o Mapa das macas.
- **Tatuador** / **Body Piercer**: enxergam a agenda completa do estúdio
  (todos os horários e macas ocupadas, de todo mundo), mas o banco (via RLS)
  só deixa cada um criar/editar/cancelar os **próprios** agendamentos. Só
  tatuador escolhe maca — body piercer agenda sem maca (um gatilho no banco
  bloqueia isso, não é só a UI que esconde o campo).
- Um colaborador **desativado** (toggle "Ativo/Desativado" na tela de
  Colaboradores) não consegue mais entrar, mesmo com a senha correta.

## Agenda

- **Sem conflito de horário**: o banco (via `EXCLUDE` constraint) impede dois
  agendamentos confirmados na mesma maca, ou para o mesmo colaborador, no
  mesmo horário — mesmo se dois cliques quase simultâneos tentarem criar o
  mesmo horário.
- **Macas**: o estúdio tem 6 macas físicas, mas só 5 entram no sistema de
  agendamento (Maca 1 a 5) — a 6ª é reservada para clientes de porta e fica
  de fora de propósito (não precisa cadastrar).
- **Mapa das macas** (`/mapa`, só admin): visão do dia organizada por maca,
  pra ver rapidinho quais estão livres em cada horário.
- **Sinal**: cada agendamento tem valor do sinal e status (pago/pendente),
  visível na lista da agenda.

## Instalar como app (PWA)

- **Celular (Android/iOS)**: abra o site no navegador → menu → "Adicionar à
  tela inicial" / "Instalar app".
- **Desktop (Chrome/Edge)**: ícone de instalação na barra de endereço.

Isso já funciona em `localhost` durante o desenvolvimento. Em produção, o
domínio precisa ter HTTPS (qualquer host tipo Vercel já resolve isso).

## Próximas etapas

Nada planejado ainda além do que já está implementado nas fases 1 e 2.
