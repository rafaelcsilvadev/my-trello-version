# my-trello-version

[![ci](https://github.com/rafaelcsilvadev/my-trello-version/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/rafaelcsilvadev/my-trello-version/actions/workflows/ci.yml)

[English](README.md) | **Português**

> 🚧 **Projeto em andamento.** A API do back-end está com todas as features prontas (0 a 6). Front-end (web) e mobile ainda não começaram.

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

---

## Stack

- **Runtime:** Node.js 24, TypeScript 6, pnpm workspace (monorepo)
- **API:** NestJS 12, class-validator, Zod (validação das variáveis de ambiente)
- **Banco:** PostgreSQL 18, TypeORM com migrations (`synchronize` desligado)
- **Auth:** JWT (`@nestjs/jwt`), senha com argon2id nativo do `node:crypto`, rate limit com `@nestjs/throttler`
- **Observabilidade:** Pino (logs JSON com request id e redação de senhas em qualquer profundidade)
- **Docs:** Swagger / OpenAPI em `/api/docs`
- **Testes:** Jest, Supertest, Testcontainers (PostgreSQL real nos testes de integração e e2e)
- **Qualidade:** oxlint (type-aware), Prettier
- **Infra:** Docker multi-stage + Docker Compose

## Destaques técnicos

- **Arquitetura modular.** Um módulo NestJS por feature (`auth`, `users`, ...), com camadas entity → repository → service → controller.
- **Erros padronizados.** Todo erro sai por um único filtro global no formato [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457), com `requestId`. Erros de domínio são mapeados para status HTTP em um só lugar.
- **Seguro por padrão.** Todas as rotas exigem token. Rotas públicas precisam de `@Public()` explícito. Login e cadastro têm rate limit por IP. A aplicação não sobe sem `JWT_SECRET` válido. Headers de segurança com `helmet`, CORS restrito às origens de `CORS_ORIGINS` e corpo JSON limitado a 100kb (`413` Problem Details).
- **Três níveis de teste.** Unitário (sem I/O), integração (repositórios contra PostgreSQL real) e e2e (HTTP contra a aplicação inteira). Mais de 1.000 testes até agora.
- **Contrato da API compartilhado.** `packages/api-contract` guarda os tipos TypeScript gerados do documento OpenAPI. O CI regenera e falha se o contrato commitado estiver desatualizado.
- **Roda com um comando.** `docker compose up` sobe API e banco, sem instalar Node nem PostgreSQL.

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

### Localmente

Requisitos: Node.js 24.17.0, pnpm 11, um PostgreSQL acessível e Docker (para os testes com Testcontainers).

```bash
pnpm install
cd back-end
cp .env.example .env    # ajuste DATABASE_URL e JWT_SECRET
pnpm start:dev          # as migrations rodam sozinhas no boot
```

### Testes

```bash
cd back-end
pnpm test               # unitários
pnpm test:integration   # integração (sobe PostgreSQL via Testcontainers)
pnpm test:e2e           # e2e HTTP
pnpm lint
```

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
├── packages/
│   └── api-contract/      # tipos da API gerados do OpenAPI
└── docker-compose.yml
```
