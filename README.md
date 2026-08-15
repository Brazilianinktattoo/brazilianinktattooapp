# Brazilian Ink Tattoo — Sistema de Gestão

PWA (funciona no navegador, instalável no celular e no desktop) para gestão do
estúdio.

- **Fase 1**: login por colaborador, papéis (Admin / Tatuador / Body Piercer)
  e tela de admin para gerenciar quem tem acesso.
- **Fase 2**: agenda — criar/editar/cancelar agendamentos com maca (só
  tatuador), sem conflito de horário, controle de sinal, e o Mapa das macas.
- **Fase 2.5**: duas unidades (Downtown e Barra Shopping) com macas próprias,
  notificações in-app, edição de e-mail/nome de colaborador, exclusão
  definitiva de agendamento, e o banco já preparado para relatórios futuros.
- **Fase 3 (atual)**: comandas (serviços + produtos por atendimento) e
  estoque único e centralizado.

Stack: Next.js (App Router) + Tailwind + Supabase (Postgres + Auth).

## 1. Criar o projeto no Supabase

1. Crie uma conta gratuita em [supabase.com](https://supabase.com) e um novo projeto.
2. Em **Project Settings > API**, copie:
   - `Project URL`
   - `anon public` key
   - `service_role` key (secreta — só usada no servidor)
3. Em **SQL Editor**, rode em ordem os arquivos de [`supabase/`](supabase/):
   1. [`schema.sql`](supabase/schema.sql) — tabela `profiles` (nome, e-mail,
      papel, ativo/inativo), gatilho que cria o perfil ao criar um login, e
      as políticas de RLS que aplicam as permissões.
   2. [`002_agenda.sql`](supabase/002_agenda.sql) — tabelas `macas` e
      `appointments`, com constraints que impedem dois agendamentos
      confirmados na mesma maca ou para o mesmo colaborador no mesmo
      horário, e um gatilho que bloqueia maca para body piercer.
   3. [`003_sinal.sql`](supabase/003_sinal.sql) — campos de sinal
      (`deposit_amount`, `deposit_status`) em `appointments`.
   4. [`004_unidades.sql`](supabase/004_unidades.sql) — tabela `units`
      (Downtown, Barra Shopping), `unit_id` em macas e agendamentos, e a
      regra de que a maca escolhida precisa ser da mesma unidade.
   5. [`005_notificacoes.sql`](supabase/005_notificacoes.sql) — tabela
      `notifications` e o gatilho que notifica o colaborador ao
      criar/alterar/cancelar um agendamento dele.
   6. [`006_admin_extras.sql`](supabase/006_admin_extras.sql) — permissão de
      exclusão definitiva de agendamento (admin) e sincronização de e-mail.
   7. [`007_estoque.sql`](supabase/007_estoque.sql) — `products` e
      `stock_entries` (estoque único, entradas sempre somam).
   8. [`008_comandas.sql`](supabase/008_comandas.sql) — `comandas`,
      `comanda_services`, `comanda_products`, com baixa automática de
      estoque e trava de edição quando a comanda está fechada.

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

- **Admin**: vê e edita tudo — qualquer agendamento, comanda, Colaboradores,
  Macas, Estoque e o Mapa das macas. Também edita nome/e-mail de qualquer
  colaborador e pode excluir um agendamento definitivamente.
- **Tatuador** / **Body Piercer**: enxergam a agenda completa do estúdio
  (todos os horários e macas ocupadas, de todo mundo, nas duas unidades),
  mas o banco (via RLS) só deixa cada um criar/editar/cancelar os
  **próprios** agendamentos e comandas. Só tatuador escolhe maca — body
  piercer agenda sem maca (um gatilho no banco bloqueia isso, não é só a UI
  que esconde o campo).
- Um colaborador **desativado** (toggle "Ativo/Desativado" na tela de
  Colaboradores) não consegue mais entrar, mesmo com a senha correta.

## Agenda

- **Duas unidades**: Downtown (5 macas) e Barra Shopping (2 macas). Ao criar
  um agendamento, escolhe primeiro a unidade e depois a maca disponível
  nela — o banco garante que a maca escolhida é sempre da unidade certa.
- **Sem conflito de horário**: o banco (via `EXCLUDE` constraint) impede dois
  agendamentos confirmados na mesma maca, ou para o mesmo colaborador, no
  mesmo horário — mesmo se dois cliques quase simultâneos tentarem criar o
  mesmo horário.
- **Macas**: o Downtown tem 6 macas físicas, mas só 5 entram no sistema de
  agendamento (Maca 1 a 5) — a 6ª é reservada para clientes de porta e fica
  de fora de propósito (não precisa cadastrar).
- **Mapa das macas** (`/mapa`, só admin): visão do dia organizada por
  unidade e maca, pra ver rapidinho quais estão livres em cada horário.
- **Sinal**: cada agendamento tem valor do sinal e status (pago/pendente),
  visível na lista da agenda.
- **Notificações**: o colaborador recebe uma notificação in-app (sininho no
  cabeçalho) quando um agendamento dele é criado, alterado ou cancelado —
  não importa se foi ele mesmo ou um admin que mexeu.
- **Excluir definitivamente**: além de cancelar, o admin pode excluir um
  agendamento por completo na lista da agenda (com confirmação).

## Comandas e estoque

- **Comanda**: pelo botão "Comanda" na linha do agendamento, o
  tatuador/piercer responsável (ou admin) abre uma comanda vinculada a ele.
  A unidade da comanda vem automaticamente do agendamento.
- Enquanto a comanda estiver **aberta**, dá pra adicionar/remover serviços
  (descrição + valor) e produtos usados (com quantidade e valor unitário) —
  só o responsável ou o admin, e o banco bloqueia qualquer edição depois
  que a comanda for **fechada** (mesmo por admin, direto no banco).
- **Estoque único** (`/estoque`, só admin): todos os produtos ficam num
  saldo só, centralizado no Downtown — não existe estoque separado por
  unidade. Ao usar um produto numa comanda (Downtown ou Barra Shopping), o
  desconto sai desse saldo único, mas a comanda registra em qual unidade
  aquele consumo aconteceu (pela unidade do agendamento vinculado).
- O banco impede lançar mais produto do que existe em estoque
  ("Estoque insuficiente para este produto").
- **Entrada de material**: sempre soma ao estoque único, sem escolher
  unidade.
- O total da comanda é só uma referência — o **pagamento** em si fica pra
  próxima fase.

## Instalar como app (PWA)

- **Celular (Android/iOS)**: abra o site no navegador → menu → "Adicionar à
  tela inicial" / "Instalar app".
- **Desktop (Chrome/Edge)**: ícone de instalação na barra de endereço.

Isso já funciona em `localhost` durante o desenvolvimento. Em produção, o
domínio precisa ter HTTPS (qualquer host tipo Vercel já resolve isso).

## Próximas etapas

Fase 4: pagamento da comanda.
