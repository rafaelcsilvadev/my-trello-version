# Púrpura Design System

Sistema de design construído a partir da cor-base **#720981** (púrpura profundo) e de duas referências visuais enviadas pelo usuário:

- `assets/references/template_auth.webp` — tela de cadastro ("Create Your Account") sobre gradiente rosa→menta, campos brancos com sombra suave, botão primário roxo, login social.
- `assets/references/template_tasks.webp` — app de gestão de tarefas em kanban: sidebar de ícones, topbar com busca/Upgrade, métricas por prioridade, colunas To Do / Overdue / Doing / Completed.

Nenhum código-fonte, Figma ou logotipo foi fornecido. As referências são inspiração — a marca "bytesize" e o ícone do template **não** foram reproduzidos. O nome provisório é **Púrpura**; onde haveria um logotipo, o nome aparece em tipo puro (Outfit 600, minúsculas).

Produtos representados: **Auth** (cadastro/login) e **Tasks** (painel kanban web, desktop).

---

## Índice

- `styles.css` — ponto de entrada (só @imports): tokens + fontes + componentes CSS
- `css/components.css` — **componentes em CSS puro** (classes `.p-*`) para qualquer stack
- `docs/index.html` — **guia completo em uma página** (abra no navegador)
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `effects.css`
- `guidelines/` — cartões de fundamentos (cores, tipo, espaçamento, marca)
- `components/`
  - `forms/` — Button, IconButton, Input, Select, Checkbox, Switch
  - `display/` — Icon, Badge, PriorityTag, Avatar, Card, StatGroup, Divider
  - `navigation/` — Tabs, SegmentedControl
  - `feedback/` — Toast, Tooltip, Dialog
  - `tasks/` — TaskCard, ColumnHeader
- `ui_kits/auth/` — cadastro + login (clicável)
- `ui_kits/tasks/` — quadro kanban + lista + diálogo de tarefa (clicável)
- `SKILL.md` — instruções para uso como Agent Skill
- `assets/references/` — imagens de referência originais
- `thumbnail.html` — miniatura do projeto

**Fonte:** `Púrpura design system.zip` (enviado pelo usuário, expandido em `uploads/`).

### Adições intencionais
Como não havia biblioteca de componentes de origem, o conjunto foi autorado a partir das telas. Itens sem contraparte direta nas imagens: **Switch, Tabs, Toast, Tooltip, Dialog** (padrões necessários para fluxos reais) e **Icon** (wrapper para Lucide).

---

## COMO USAR EM OUTROS PROJETOS

1. **Neste app:** Compartilhar → Tipo de arquivo → *Design System*. Em projetos novos, anexe "Púrpura".
2. **Qualquer stack:** copie `styles.css`, `tokens/` e `css/`; adicione `<link rel="stylesheet" href="styles.css">` e `class="p-root"` no body. Use `.p-btn`, `.p-input`, `.p-card`, `.p-badge`, `.p-tabs`, `.p-dialog`, `.p-table`… (veja `docs/index.html`).
3. **React:** copie também `components/` e importe (`import { Button } from './components/forms/Button.jsx'`).
4. **Só tokens:** use as variáveis (`var(--brand)`, `var(--type-h2)`, `var(--radius-lg)`) no seu próprio CSS/Tailwind.

## CONTENT FUNDAMENTALS

- **Idioma:** português do Brasil. As referências estão em inglês; o sistema traduz para pt-BR.
- **Pessoa:** fala com o usuário como "você", de forma direta e cordial. Nunca "nós" corporativo em UI. Ex.: "Bom te ver de novo. Entre para continuar."
- **Caixa:** *sentence case* em tudo — títulos, botões, rótulos ("Crie sua conta", "Criar tarefa", "Média prioridade"). Nunca CAIXA ALTA, exceto siglas.
- **Botões:** verbo no infinitivo, 1–2 palavras: "Cadastrar", "Entrar", "Criar tarefa", "Filtrar", "Salvar". O destaque é dado pela variante, não pela pontuação.
- **Rótulos:** substantivos curtos — "Prioridade", "Responsável", "Prazo", "E-mail", "Confirmar senha".
- **Status:** "A fazer", "Atrasado", "Em andamento", "Concluído". Prioridade: "Baixa", "Média", "Alta".
- **Erros:** dizem o que aconteceu e como resolver, sem culpa: "As senhas não coincidem", "Senha incorreta. Tente novamente."
- **Confirmações:** curtas, no particípio: "Tarefa criada", "Conta criada! Verifique seu e-mail."
- **Datas:** "12 fev, 2025" (dia + mês abreviado minúsculo + ano).
- **Emoji:** não usados. Ponto de exclamação: no máximo um, só em celebração.
- **Vibe:** profissional, calma, organizada — produtividade sem barulho.

## VISUAL FOUNDATIONS

- **Cor:** a púrpura #720981 (`--purple-700`) é a única cor de marca e aparece com parcimônia: botão primário, item ativo da sidebar, links, foco. Tons claros (`--purple-50/100`) para seleção e checkbox marcado. Neutros são cinzas com leve tom ameixa. Cor funcional (verde/âmbar/vermelho/azul) só para prioridade, status e feedback. Dourado (`--gold-400`) exclusivo para "Upgrade".
- **Tipografia:** Outfit (geométrica, títulos e números de métricas) + Onest (UI e texto). Base 14px; metadados 13px; legendas 12px. Títulos com tracking negativo (−0.02em).
- **Fundos:** app em `--surface-page` (#F7F6F9) com cartões brancos. Telas de auth usam `--gradient-auth` — gradiente vertical muito suave rosa→lilás→menta. Sem imagens, texturas ou ilustrações. `--gradient-desk` serve só para apresentações/mockups (bolhas roxas desfocadas).
- **Cartões:** branco, borda 1px `--border-subtle`, raio 10px, sombra quase imperceptível (`--shadow-xs`). Hover: borda um tom mais escura + `--shadow-md`. Selecionado: borda purple-300 + anel de foco.
- **Bordas vs sombras:** bordas hairline fazem a separação; sombras são leves. Divisores verticais separam métricas e colunas do kanban.
- **Campos:** brancos, 46px em formulários (36px em toolbars), raio 6px, borda sutil + `--shadow-input` (leve brilho roxo). Foco: borda purple-500 + anel 3px a 22%.
- **Raios:** 4 (tags/contadores), 6 (botões/campos), 8 (toggles/ícones), 10 (cartões), 14 (diálogos), 20 (janela). Avatares circulares. Nada em pílula exceto avatar/switch.
- **Espaçamento:** escala de 2/4px (2, 4, 6, 8, 10, 12, 16, 20, 24, 32…). Rótulo→campo 8px; campo→campo 16px; colunas do kanban 16px de padding; cartões 14px internos.
- **Layout:** sidebar fixa de 52px só com ícones; topbar de 52px; conteúdo em grade de 4 colunas iguais no kanban. Auth: coluna central de 420px, wordmark no canto superior esquerdo.
- **Hover:** fundos ficam um passo mais escuros (primário 700→800; neutro transparente→neutral-100). **Press:** dois passos + deslocamento de 0.5px. Sem escala/encolhimento.
- **Animação:** discreta e funcional. 120ms para cor, 180ms para sombra/posição, `cubic-bezier(.2,0,0,1)`; switch usa leve overshoot. Sem bounces decorativos, sem parallax.
- **Transparência/blur:** apenas overlay do diálogo (`--surface-overlay`, 40%). Sem glassmorphism.
- **Cabeçalhos de status:** preenchimento tinto + barra de 2px à esquerda na cor do status — é o único uso de acento lateral, restrito a esse componente.
- **Imagens:** não há fotografia no sistema; avatares usam iniciais sobre cores sólidas.

## ICONOGRAPHY

- **Conjunto:** [Lucide](https://lucide.dev), via CDN `lucide-static@0.454.0`, renderizado pelo componente `Icon` com CSS mask (herda `currentColor`). **Substituição sinalizada:** as referências usam um conjunto de traço fino semelhante (provavelmente Tabler/Lucide); Lucide foi escolhido como o mais próximo.
- **Estilo:** contorno, traço 2px, cantos arredondados. 14px em metadados de cartão, 16px em botões, 18–20px em topbar/sidebar.
- **Cor:** ícones herdam a cor do texto (normalmente `--text-secondary`/`--text-tertiary`). Só recebem cor: bandeira de prioridade, ícones de métrica/status e item ativo.
- **Emoji / unicode:** não usados como ícones.
- **Logotipos de terceiros** (Google, Microsoft Teams) nos botões sociais: não incluídos — substituídos por ícones Lucide genéricos. Adicione os SVGs oficiais em `assets/`.
- **Logotipo próprio:** não fornecido. Use o wordmark em tipo puro e o monograma "p" em quadrado púrpura (8px de raio) na sidebar.
