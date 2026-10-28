# my-trello-version

[![ci](https://github.com/rafaelcsilvadev/my-trello-version/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/rafaelcsilvadev/my-trello-version/actions/workflows/ci.yml)

[English](README.md) | **Português**

> 🚧 **Projeto em andamento.** A API do back-end está com todas as features prontas (0 a 6). O front-end (web) já tem a base pronta (ainda sem telas). O mobile ainda não começou.

Uma versão pessoal do Trello: cada usuário se cadastra e gerencia só os próprios quadros, listas e cartões.

O projeto tem dois objetivos:

1. Construir uma API com práticas de produção: arquitetura modular, testes em três níveis, erros padronizados, logs estruturados e tudo rodando com Docker.
2. Mostrar um jeito **disciplinado** de desenvolver com IA: especificação antes do código, TDD, commits pequenos, verificação independente e revisão humana de cada Pull Request.

---

## Status

| # | Feature | O que entrega | Status |
|---|---------|---------------|--------|
| 0 | `foundation` | Setup NestJS + pnpm, Docker, health check, config validada, TypeORM + migrations, erros RFC 9457, logs estruturados com request id, Swagger, infraestrutura de testes | ✅ Concluída |
| 1 | `auth` | Cadastro, login com JWT, `GET /me`, guard global, rate limit por IP | ✅ Concluída |
| 2 | `boards` | CRUD dos quadros do usuário, arquivar | ✅ Concluída |
| 3 | `lists` | CRUD de listas dentro do quadro, reordenar | ✅ Concluída |
| 4 | `cards` | Título, descrição, prazo, concluído, arquivar, mover e reordenar | ✅ Concluída |
| 5 | `labels` | Etiquetas do quadro aplicadas aos cartões | ✅ Concluída |
| 6 | `checklists` | Itens de checklist no cartão | ✅ Concluída |

MVP = features 0 a 4. Roadmap completo em [`back-end/.specs/ROADMAP.md`](back-end/.specs/ROADMAP.md).

Front-end (web): `foundation` (estrutura do app, rotas e guard de autenticação, cliente tipado da API, tema, i18n PT-BR/EN, toasts, serviço Docker, CI) `auth` (cadastro, login, aviso de rate limit, logout) `boards` (abas de ativos/arquivados, criar, editar, arquivar, restaurar, excluir) e `board` (colunas e tarefas, marcar como concluída, itens arquivados, quadro arquivado somente leitura, layout de celular) concluídas. Arrastar e soltar vem a seguir, uma feature por vez. Roadmap em [`front-end/.specs/ROADMAP.md`](front-end/.specs/ROADMAP.md).

---

## Stack

- **Runtime:** Node.js 24, TypeScript 6, pnpm workspace (monorepo)
- **API:** NestJS 12, class-validator, Zod (validação das variáveis de ambiente)
- **Banco:** PostgreSQL 18, TypeORM com migrations (`synchronize` desligado)
- **Auth:** JWT (`@nestjs/jwt`), senha com argon2id nativo do `node:crypto`, rate limit com `@nestjs/throttler`
- **Observabilidade:** Pino (logs JSON com request id e redação de senhas em qualquer profundidade)
- **Docs:** Swagger / OpenAPI em `/api/docs`
- **Web:** React 19 + Vite 8, React Router 8, TanStack Query, `openapi-fetch`, Tailwind CSS v4, i18next, servido por nginx no Docker
- **Testes:** Jest, Supertest, Testcontainers (PostgreSQL real nos testes de integração e e2e); Vitest, Testing Library, MSW e Playwright no app web
- **Qualidade:** oxlint (type-aware), Prettier
- **Infra:** Docker multi-stage + Docker Compose

## Destaques técnicos

- **Arquitetura modular.** Um módulo NestJS por feature (`auth`, `users`, ...), com camadas entity → repository → service → controller.
- **Erros padronizados.** Todo erro sai por um único filtro global no formato [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457), com `requestId`. Erros de domínio são mapeados para status HTTP em um só lugar.
- **Seguro por padrão.** Todas as rotas exigem token. Rotas públicas precisam de `@Public()` explícito. Login e cadastro têm rate limit por IP. A aplicação não sobe sem `JWT_SECRET` válido. Headers de segurança com `helmet`, CORS restrito às origens de `CORS_ORIGINS` e corpo JSON limitado a 100kb (`413` Problem Details).
- **Três níveis de teste.** Unitário (sem I/O), integração (repositórios contra PostgreSQL real) e e2e (HTTP contra a aplicação inteira). Mais de 1.000 testes até agora.
- **Contrato da API compartilhado.** `packages/api-contract` guarda os tipos TypeScript gerados do documento OpenAPI. O CI regenera e falha se o contrato commitado estiver desatualizado.
- **Roda com um comando.** `docker compose up` sobe o app web, a API e o banco, sem instalar Node nem PostgreSQL.

---

## Como a IA é usada neste projeto

O código é escrito em par com o **[Claude Code](https://claude.com/claude-code)** (agente de IA da Anthropic que roda no terminal). A IA não gera o projeto "de uma vez". Ela segue um processo fixo, e **eu tomo as decisões e reviso cada Pull Request antes do merge**.

### 1. Especificação antes do código (Spec-Driven Development)

Cada feature passa por quatro fases, guiadas pela skill `tlc-spec-driven`:

| Fase | O que sai | Onde fica |
|------|-----------|-----------|
| **Specify** | Requisitos testáveis em notação **EARS** (`WHEN ... THEN the system SHALL ...`), cada um com ID (`AUTH-01`, `FND-07`, ...) | `spec.md` |
| **Context** | Decisões de produto discutidas comigo (ex.: só access token, sem refresh nesta fase) | `context.md` |
| **Design** | Desenho técnico: módulos, contratos, fluxo de erros | `design.md` |
| **Tasks** | Tarefas atômicas, cada uma com critérios "Done when" e ligada aos requisitos que cobre | `tasks.md` |

Tudo fica versionado em [`back-end/.specs/features/`](back-end/.specs/features/). A feature `auth`, por exemplo, tem 20 critérios de aceitação e 12 tarefas.

### 2. Registro de decisões de arquitetura

Decisões importantes viram entradas numeradas em `STATE.md`, com **decisão, motivo, trade-off e status**. Exemplos:

- `GL-AD-001`: monorepo pnpm com um único lockfile ([`.specs/STATE.md`](.specs/STATE.md))
- `BE-AD-004`: todo erro sai como Problem Details por um filtro global ([`back-end/.specs/STATE.md`](back-end/.specs/STATE.md))
- `BE-AD-006`: guard JWT global com opt-out explícito via `@Public()`

Assim a IA (e qualquer pessoa) entende o *porquê* do código em sessões futuras, sem depender de memória.

### 3. Implementação com TDD e commits pequenos

Na fase de execução, a skill `pair-programming` assume:

- Cada tarefa segue **TDD**: teste falhando → código mínimo → refatoração.
- **Um commit por tarefa**, no padrão Conventional Commits (`feat(auth): add login endpoint`), pequeno o bastante para revisar em minutos.
- Testes vão no mesmo commit do código que cobrem. Todo commit compila e passa nos testes.
- Uma feature vira um **Pull Request**, que eu reviso antes do merge.

Os commits feitos em par com a IA têm o trailer `Co-Authored-By: Claude`, então o histórico mostra com transparência onde ela participou.

### 4. Verificação independente (autor ≠ verificador)

Quando a feature termina, um **sub-agente separado**, que não escreveu o código, valida o trabalho:

- **Rastreabilidade:** cada critério de aceitação precisa apontar para um teste real (`arquivo:linha` + assertion). Sem evidência, o critério não passa.
- **Sensor de discriminação (mutation testing leve):** o verificador injeta bugs de propósito no código e confere se os testes pegam. Na `foundation`, 10 de 10 mutantes foram mortos. Na `auth`, 14 de 16 (os 2 restantes não mudam comportamento observável).
- **Relatório:** veredito, lacunas encontradas e plano de correção ficam em `validation.md`.

As lacunas viram tarefas e PRs próprios. Exemplo: o PR #29 adicionou testes de borda que a validação da `auth` apontou (email com exatamente 254 caracteres, token enviado com esquema `Basic`, etc.).

### 5. Lições que aprendem com o projeto

Problemas achados na validação viram **lições** registradas por script em [`back-end/.specs/LESSONS.md`](back-end/.specs/LESSONS.md). Exemplos:

- "Para todo limite de tamanho, teste o maior valor aceito e o primeiro rejeitado."
- "Redija chaves sensíveis em qualquer profundidade, não só em caminhos fixos."

Uma lição só vira regra confirmada quando aparece em mais de uma feature. Assim o processo melhora a cada ciclo sem acumular regra inútil.

### 6. Ferramentas de apoio

- **CodeGraph (MCP):** índice do código em grafo, usado pela IA para achar símbolos, chamadas e impacto de mudanças sem ler arquivos às cegas.
- **Skills customizadas:** instruções reutilizáveis que fixam o processo (spec, TDD, revisão, commits), para a IA trabalhar do mesmo jeito em toda sessão.

### Meu papel

- Definir escopo e prioridades de cada feature.
- Responder às perguntas de produto e aprovar spec, design e tarefas.
- Revisar e aprovar cada Pull Request.
- Questionar e corrigir decisões da IA quando não fazem sentido.

---

## Como rodar

### Com Docker (recomendado)

```bash
git clone https://github.com/rafaelcsilvadev/my-trello-version.git
cd my-trello-version
docker compose up --build
```

- API: http://localhost:3000/api/v1
- Health check: http://localhost:3000/api/v1/health
- Swagger: http://localhost:3000/api/docs
- App web: http://localhost:5173

A imagem web grava o `VITE_API_URL` (padrão `http://localhost:3000`) no bundle durante o build. Para apontar para outra origem da API, mude o build arg `VITE_API_URL` do serviço `web` no `docker-compose.yml` e refaça o build.

Para carregar os dados de demonstração (um usuário com boards, listas, cards, labels e checklists), rode em outro terminal:

```bash
docker compose exec api node dist/seed/seed.js
```

Depois entre com `demo@example.com` / `demo1234`. Cada execução volta a conta demo para os mesmos dados; outros usuários não são afetados.

No app web:

1. Abra http://localhost:5173. Sem sessão, você cai em `/login`.
2. Entre com o usuário demo acima, ou siga **Criar conta** para se cadastrar com seu próprio e-mail (nome, e-mail, senha de 8 a 72 caracteres). Os dois levam a `/boards`.
3. Abra **Configurações** (ícone de engrenagem na barra superior) para ver a conta conectada e **Sair**.

Gerenciando quadros em `/boards`:

- **Criar quadro** abre um formulário com nome (até 100 caracteres) e descrição opcional (até 1000). Ao salvar, você vai para o novo quadro em `/b/{id}`.
- Cada cartão de quadro tem o menu **Ações do quadro**. Na aba **Ativos**, ele oferece **Editar** (o mesmo formulário, preenchido) e **Arquivar**.
- Quadros arquivados vão para a aba **Arquivados**, onde o menu oferece **Restaurar** (volta para **Ativos**) e **Excluir definitivamente**.
- **Excluir definitivamente** apaga o quadro com todas as colunas, tarefas e etiquetas. Não dá para desfazer, então o botão só libera depois que você digita o nome do quadro.

Usando um quadro em `/b/{id}`:

- Um quadro novo não tem colunas, então abre com **Adicione a primeira coluna**. Digite um nome (até 100 caracteres) e aperte Enter; o campo fica aberto para a próxima. **Adicionar coluna**, depois da última coluna, faz o mesmo depois.
- Clique no nome de uma coluna (ou escolha **Renomear** no menu **Ações da coluna**) para renomeá-la; Enter ou sair do campo salva, Esc cancela. **Arquivar**, no mesmo menu, esconde a coluna.
- **Adicionar tarefa**, no rodapé de uma coluna, abre um campo de título (até 100 caracteres); Enter adiciona a tarefa no fim e mantém o campo aberto, Esc fecha. Aperte `n` fora de um campo de texto para abri-lo na primeira coluna.
- Marque **Concluída** em uma tarefa para concluí-la; ela aparece riscada.
- Ligue **Mostrar arquivadas** na barra de ferramentas para ver, depois das colunas ativas, a coluna **Arquivadas** com todas as tarefas arquivadas (com a data e a coluna de origem) e a seção **Colunas arquivadas**. Ali, **Restaurar** devolve a coluna para o fim e **Excluir definitivamente** apaga a coluna com todas as tarefas, depois de uma confirmação que diz quantas tarefas vão junto. A chave começa desligada sempre que o quadro abre.
- Um quadro arquivado (aberto pela aba **Arquivados**) é somente leitura: um aviso diz "Quadro arquivado · somente leitura", os controles de adicionar e os menus de coluna somem e as caixas de seleção ficam desabilitadas. **Restaurar**, no aviso, libera a edição de novo.
- No celular, o quadro mostra uma coluna por tela. Deslize entre elas, ou toque em um ponto abaixo do cabeçalho; o texto ao lado dos pontos diz "{coluna} · 1 de 3". A seta de voltar leva a `/boards`.

As mudanças aparecem na hora e são salvas em segundo plano. Se salvar falhar, a mudança é desfeita e um toast oferece **Tentar novamente**.

Uma página aberta sem sessão manda para `/login` e volta para ela depois do login. A API limita tentativas de login por IP; quando o limite estoura, o formulário pede para esperar um minuto.

Para parar tudo (use `-v` para apagar também o volume do banco):

```bash
docker compose down
```

### Localmente

Requisitos: Node.js 24.17.0, pnpm 11, um PostgreSQL acessível e Docker (para os testes com Testcontainers).

```bash
pnpm install
cd back-end
cp .env.example .env    # ajuste DATABASE_URL e JWT_SECRET
pnpm start:dev          # as migrations rodam sozinhas no boot
```

Dados de demonstração (o seed lê as variáveis de ambiente, não o `.env`):

```bash
set -a && . ./.env && set +a && pnpm seed
```

App web, a partir da raiz do repositório, com a API rodando (Docker ou `pnpm start:dev`):

```bash
cd front-end
pnpm dev                # http://localhost:5173
```

- `VITE_API_URL` define a origem da API (padrão `http://localhost:3000`), por exemplo `VITE_API_URL=http://localhost:4000 pnpm dev`.
- Mantenha a porta 5173: a API só aceita chamadas do navegador vindas das origens em `CORS_ORIGINS` (`http://localhost:5173` no `docker-compose.yml`).

### Testes

Back-end, a partir da raiz do repositório:

```bash
cd back-end
pnpm test               # unitários
pnpm test:integration   # integração (sobe PostgreSQL via Testcontainers)
pnpm test:e2e           # e2e HTTP
pnpm lint
```

App web, a partir da raiz do repositório:

```bash
cd front-end
pnpm test               # unitários e de componente (Vitest + MSW)
pnpm typecheck
pnpm lint
pnpm build
pnpm exec playwright install chromium   # uma vez, baixa o navegador
pnpm test:e2e           # Playwright; sobe postgres e api com docker compose
```

O `test:e2e` deixa os containers `postgres` e `api` rodando, para a próxima execução ser mais rápida. Pare-os a partir da raiz do repositório com `docker compose down`.

---

## Estrutura

```
my-trello-version/
├── .specs/                # decisões globais do monorepo
├── back-end/
│   ├── .specs/            # roadmap, decisões, lições e specs por feature
│   ├── src/               # módulos NestJS (auth, users, health, errors, logging, ...)
│   ├── test/              # unit/, integration/, e2e/
│   └── Dockerfile
├── front-end/
│   ├── .specs/            # roadmap, decisões e specs por feature
│   ├── src/               # app/, pages/, shared/, styles/
│   ├── test/              # unit/, e2e/, support/
│   ├── Dockerfile
│   └── nginx.conf
├── packages/
│   └── api-contract/      # tipos da API gerados do OpenAPI
└── docker-compose.yml
```
