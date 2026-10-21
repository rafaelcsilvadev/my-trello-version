# my-trello-version — Documentação de comportamento

Kanban pessoal estilo Trello, mais simples: **Quadro → Coluna → Tarefa**. O protótipo reflete exatamente o que a API do back-end entrega. Interface em PT-BR e EN (todos os textos ficam em `i18n.js`).

- Protótipo: `Task List.dc.html` (versão anterior preservada em `Task List v1.dc.html`)
- Visual: Púrpura Design System, temas claro e escuro, estilizado com Tailwind CSS v4
- Texto: *sentence case*, botões no infinitivo, sem emoji na interface

---

## 1. Glossário

| Termo | Significado |
|---|---|
| Quadro | Espaço de trabalho com colunas, tarefas e etiquetas próprias. Pode estar **ativo** ou **arquivado**. |
| Coluna | Etapa do fluxo dentro de um quadro. Só tem nome. Pode estar **ativa** ou **arquivada**. |
| Tarefa | Card de uma coluna. Pode estar **ativa** ou **arquivada**, e **concluída** ou não. |
| Concluída | Marca da tarefa, independente do prazo e da coluna. |
| Item de checklist | Texto com marcação, dentro de uma tarefa. |
| Prazo | Só data, sem hora. |
| Etiqueta | Nome + uma das 10 cores fixas. Pertence a um quadro. |

**Fora do escopo:** prioridade, ordenação, estatísticas, recorrência, hora no prazo, coluna "Concluída" fixa, visão Lista, visão Hoje, busca global, barra lateral, cor de quadro e de coluna, reordenar quadros, mover tarefa entre quadros, excluir tarefa ativa, excluir coluna ativa, excluir quadro ativo, "Desfazer".

---

## 2. Modelo de dados

| Entidade | Campos | Regras |
|---|---|---|
| Conta | nome, e-mail, senha | Nome de 1 a 100 caracteres. Senha de 8 a 72 caracteres. |
| Quadro | nome, descrição, criado em, arquivado em | Nome de 1 a 100. Descrição opcional, até 1000. Começa sem colunas. |
| Coluna | nome, posição, arquivada em | Nome de 1 a 100. |
| Tarefa | título, descrição, prazo, concluída, etiquetas, checklist, coluna, posição, criada em, arquivada em | Título de 1 a 100. Descrição até 5000. |
| Item de checklist | texto, marcado, posição | Texto de 1 a 200. |
| Etiqueta | quadro, nome, cor | Nome de 1 a 50, único no quadro sem diferenciar maiúsculas. Cor entre as 10 fixas. |

Não há limites de quantidade (quadros, colunas, tarefas, itens ou etiquetas). Os identificadores são gerados pelo servidor.

**Atrasada:** a tarefa está ativa, **não concluída** e o prazo é anterior a hoje. Aparece com a data em vermelho e o selo "Atrasada".

---

## 3. Navegação e rotas

- **Desktop:** barra superior com o logo "task list" (leva a Meus quadros), o caminho "Meus quadros › Quadro › Etiquetas", o ícone de atalhos e o ícone de Configurações. Não há barra lateral.
- **Celular (360–390 px):** pilha de telas Meus quadros → Quadro → Detalhe (tela cheia). Cada tela tem a seta de voltar no topo. No quadro, o menu (…) do cabeçalho fica no topo, à direita.
- O ícone de Configurações aparece em Meus quadros e no Quadro.

| Rota | Tela |
|---|---|
| `/login` | Entrar |
| `/signup` | Criar conta |
| `/boards` | Meus quadros (abas Ativos · Arquivados) |
| `/b/{quadro}` | Quadro |
| `/b/{quadro}/t/{tarefa}` | Detalhe da tarefa (sobre o quadro) |
| `/b/{quadro}/labels` | Etiquetas do quadro |
| `/settings` | Configurações |

---

## 4. Acesso

### Criar conta
- Campos: **Nome**, **E-mail** e **Senha**. Abaixo da senha, a dica "Use de 8 a 72 caracteres".
- Erros por campo: "Informe seu nome" · "Use até 100 caracteres" · "Informe um e-mail válido" · "Use de 8 a 72 caracteres" · "Este e-mail já está cadastrado".
- O botão mostra "Criando…" enquanto envia. Em caso de sucesso, entra direto em Meus quadros, com o aviso "Conta criada".
- Link "Já tenho conta".

### Entrar
- Campos: E-mail e Senha. Link "Criar conta".
- O botão mostra "Entrando…" enquanto envia.
- Erro genérico, que não diz qual campo errou: **"E-mail ou senha inválidos"**.

### Limite de tentativas
- O servidor limita tentativas por IP em Entrar e em Criar conta. Ao passar do limite, aparece no topo do formulário: **"Muitas tentativas. Aguarde um minuto e tente novamente."**
- O botão continua habilitado; novas tentativas dentro do minuto mostram o mesmo aviso.

### Sessão expirada
- Acontece quando uma requisição a uma **rota autenticada** recebe a resposta **401**.
- **Nota de implementação:** o login com senha errada também responde 401 (`invalid-credentials`). Esse 401 não é sessão expirada: mostra "E-mail ou senha inválidos" e não redireciona.
- Vai para Entrar com o aviso "Sua sessão expirou. Entre novamente."
- Depois de entrar, volta para a mesma tela (quadro e detalhe incluídos).

### Sair
- Em Configurações → Sessão. Encerra a sessão só neste aparelho e vai para Entrar.

---

## 5. Meus quadros

- Alternância **Ativos · Arquivados** acima da grade.
- Grade de cards com o nome, a descrição em até 2 linhas (quando houver) e a data. Ordem: **mais recentes primeiro**, como a API entrega.
- **Criar quadro** (só na aba Ativos) abre o modal com **Nome** e **Descrição** (opcional, com contador "n / 1000"). O mesmo modal serve para **Editar quadro**.
  - Erros: "Dê um nome ao quadro" · "Use até 100 caracteres" · "Use até 1000 caracteres".
  - Ao criar, o quadro novo já abre (vazio, sem colunas).

### Ativos
- Card com "Criado em 10 out, 2026".
- Menu (…): **Editar** · **Arquivar**. Arquivar mostra o aviso "Quadro arquivado" e o quadro passa para a aba Arquivados.

### Arquivados
- Mesma grade, com "Arquivado em 2 out, 2026".
- Menu (…): **Restaurar** · **Excluir definitivamente**.
- Vazia: "Nenhum quadro arquivado".
- **Excluir definitivamente** só existe para quadro arquivado. O diálogo "Excluir o quadro Old side project definitivamente?" explica que apaga o quadro com todas as colunas, tarefas e etiquetas. Tem o campo "Digite o nome do quadro para confirmar", e o botão só habilita quando o nome digitado é exato.

### Quadro arquivado aberto
- É somente leitura. No topo, a faixa **"Quadro arquivado · somente leitura"** com o botão **Restaurar**.
- Nada é editável nem arrastável: sem adicionar coluna ou tarefa, sem menus de coluna e de card, sem marcar concluída, detalhe e etiquetas em modo leitura.

### Estados
- Carregando: *skeleton* de cards.
- Vazio (aba Ativos): "Crie seu primeiro quadro" + botão.
- Erro: "Não foi possível carregar" + **Tentar novamente**.

---

## 6. Quadro

### Cabeçalho
- Nome do quadro, a descrição (quando houver) e o menu (…) com **Etiquetas do quadro**.
- Barra de ferramentas: busca, filtro de Etiquetas, filtro de Prazo e a chave **Mostrar arquivadas**.

### Busca e filtros
- Valem só para as tarefas **ativas** das colunas ativas do quadro aberto.
- A busca procura no título e na descrição, sem diferenciar maiúsculas e acentos. Atalho `/`. Esc limpa o campo.
- **Etiquetas:** multisseleção entre as etiquetas do quadro. Mostra as tarefas com pelo menos uma das etiquetas marcadas. O botão mostra "Etiquetas · 2".
- **Prazo:** Qualquer prazo · Atrasadas · Vencem hoje · Sem prazo · **Concluídas**.
- Com busca ou filtro ativo:
  - aparece a contagem ("3 tarefas") e **Limpar filtros**;
  - aparece o aviso "Arrastar fica desativado enquanto há filtros";
  - cards e colunas deixam de ser arrastáveis.
- Sem resultados: "Nenhuma tarefa encontrada" + Limpar filtros.
- A busca, os filtros e a chave Mostrar arquivadas **voltam ao padrão sempre que o quadro é aberto**.

### Colunas
- Ficam lado a lado, com rolagem horizontal e o fundo neutro do sistema.
- Cabeçalho da coluna:
  - nome: clicar edita no lugar. Enter salva, Esc cancela e sair do campo também salva;
  - contador de tarefas ativas;
  - menu (…): **Renomear** · **Arquivar**. Não existe excluir coluna ativa.
- Nome: erros "Dê um nome à coluna" · "Use até 100 caracteres".
- **+ Adicionar coluna** no fim do quadro: campo no lugar, Enter cria e o campo continua aberto.
- **Arquivar coluna** tira a coluna do quadro, com o aviso "Coluna arquivada". As tarefas dela ficam intactas.
- Colunas são reordenadas arrastando pelo cabeçalho (mouse ou teclado).
- Quadro sem colunas: "Adicione a primeira coluna" + campo no lugar.
- Coluna vazia: "Arraste cards para cá".

### Colunas arquivadas
- Aparecem ao ligar **Mostrar arquivadas**, como uma seção de borda tracejada no fim do quadro, depois da coluna virtual "Arquivadas".
- Lista as colunas da mais recente para a mais antiga, com "Arquivada em 2 out, 2026 · 3 tarefas" (ativas e arquivadas).
- Ações:
  - **Restaurar:** a coluna volta para o fim do quadro, com o aviso "Coluna restaurada".
  - **Excluir definitivamente:** confirmação que cita o número: "Isso apaga a coluna e as 3 tarefas dela, ativas e arquivadas. Não dá para desfazer." (com 1 tarefa: "…e a 1 tarefa dela…"; sem tarefas: "Isso apaga a coluna, que não tem tarefas…").
- Vazia: "Nenhuma coluna arquivada".

### Coluna virtual "Arquivadas"
- Aparece no fim do quadro ao ligar **Mostrar arquivadas**.
- Visual distinto: borda tracejada, fundo transparente e ícone de arquivo. Não tem menu, não pode ser arrastada nem editada.
- Os cards são somente leitura, dos mais recentes para os mais antigos, com "Arquivada em 2 out, 2026 · de: Doing".
- Inclui as tarefas arquivadas de colunas arquivadas. Essas não podem ser restauradas nem excluídas antes de restaurar a coluna (ver Detalhe da tarefa).
- Vazia: "Nenhuma tarefa arquivada".

### Criar tarefa
- **+ Adicionar tarefa** no rodapé de cada coluna abre um campo no lugar.
- Enter cria a tarefa no fim da coluna e mantém o campo aberto para a próxima. Esc fecha.
- Erros: "Dê um título à tarefa" · "Use até 100 caracteres".
- Atalho `n`: abre o campo na primeira coluna.

### Card
- Etiquetas (com nome e cor).
- **Checkbox de concluída** à esquerda do título. Marcar não abre o detalhe.
- Título e menu (…) → **Mover para…**.
- Linha de informações, quando houver:
  - prazo ("Hoje", "Amanhã", "Ontem", "12 out");
  - selo **Atrasada**;
  - checklist "2/4", em verde quando completo.
- **Concluída:** título atenuado e riscado, prazo em verde, sem selo Atrasada.
- Clicar ou apertar Enter abre o detalhe. O card tem foco de teclado visível (contorno roxo).

### Arrastar com o mouse
- Cards podem ir para outra coluna ou mudar de posição na mesma coluna. Colunas são arrastadas pelo cabeçalho.
- Durante o arraste:
  - o card de origem fica tracejado e translúcido;
  - a coluna de destino ganha contorno roxo tracejado;
  - um espaço tracejado mostra onde o card vai cair.
- **Falha ao salvar:** o card volta à posição anterior e aparece o aviso "Não foi possível mover a tarefa".

### Arrastar com o teclado
| Tecla | Ação |
|---|---|
| Espaço (card em foco) | Pega o card |
| ↑ ↓ | Muda a posição na coluna |
| ← → | Muda de coluna |
| Espaço ou Enter | Solta |
| Esc | Cancela e devolve o card ao lugar original |

- Enquanto o card está pego, ele aparece levantado. Uma faixa explica o movimento: "Movendo “X”: Doing, posição 2 de 3…".
- Uma região viva anuncia cada passo: "Tarefa X, coluna Doing, posição 2 de 5". Ao final, anuncia "solta em…" ou "Movimento cancelado".
- Abaixo do quadro fica o texto de ajuda: "Teclado: Espaço pega o card, a coluna ou o item em foco · setas movem · Espaço solta · Esc cancela".

### Arrastar colunas e itens com o teclado
- **Colunas:** com o foco no cabeçalho, Espaço pega, ← → movem, Espaço solta, Esc cancela. Mesma faixa explicativa e anúncio na região viva: "Coluna Doing, posição 2 de 3".
- **Itens do checklist:** a alça é focável. Espaço pega, ↑ ↓ movem, Espaço solta, Esc cancela. Anúncio: "Item Coffee, posição 2 de 3".

### Estados do quadro
- **Carregando:** *skeleton* do cabeçalho, das colunas e dos cards.
- **Erro:** "Não foi possível carregar" + Tentar novamente.
- **Não encontrado** (quadro inexistente ou excluído em outro dispositivo, em `/b/{quadro}`): "Quadro não encontrado" + "Ele pode ter sido excluído." + **Voltar para Meus quadros**.

### Celular
- Uma coluna por tela, com rolagem que se encaixa em cada coluna e uma "espiada" da próxima.
- Indicador de páginas com pontos clicáveis e o texto "Doing · 2 de 3".
- Para mover um card no celular: menu (…) → **Mover para…** → lista de colunas, com a atual marcada.

---

## 7. Detalhe da tarefa

- Desktop: **modal** centralizado sobre o quadro, em `/b/{quadro}/t/{tarefa}`. Celular: tela cheia, com seta de voltar.
- Cabeçalho: nome da coluna atual e botão fechar.
- **Checkbox de concluída** ao lado do título. Concluída mostra o selo "Concluída".
- **Título** editável no lugar. Enter ou sair do campo salva, Esc desfaz. Erros: "Dê um título à tarefa" · "Use até 100 caracteres". Aparece o selo "Atrasada" quando for o caso.
- **Prazo:** seletor de data (só data) + "Remover prazo".
- **Etiquetas:** as etiquetas aplicadas + o botão "+", que abre um popover com:
  - busca;
  - lista das etiquetas **do quadro** para marcar e desmarcar;
  - **Criar etiqueta** (nome + uma das 10 cores);
  - link **Gerenciar etiquetas**, que leva a `/b/{quadro}/labels`.
- **Descrição:** caixa de texto com contador "n / 5000". Com alterações, aparecem **Salvar** e **Cancelar**. Acima de 5000: "Use até 5000 caracteres".
- **Checklist:** barra de progresso + "2/4".
  - Itens podem ser marcados, editados, reordenados (arrastando ou pelo teclado na alça) e excluídos, sem confirmação.
  - Editar o texto: Enter salva, Esc cancela, sair do campo salva.
  - "Adicionar item" com Enter.
  - Erros: "Escreva o item" · "Use até 200 caracteres".
- Rodapé: "Criada em 3 out, 2026" · **Mover para…** · **Arquivar**.
- **Fechar** (X, Esc, clique fora ou voltar) com edição não salva abre o diálogo "Descartar alterações?" ("Você tem edições não salvas."), com **Continuar editando** · **Descartar**. Contam como edição não salva: título alterado, descrição alterada e item de checklist em edição.

### Tarefa arquivada (modo leitura)
- Aviso "Tarefa arquivada · somente leitura". Os campos ficam bloqueados e atenuados.
- **Restaurar:** a tarefa volta para o fim da coluna de origem.
- **Excluir definitivamente:** pede confirmação com o texto "Isso apaga a tarefa e o checklist. Não dá para desfazer."
- **Coluna de origem arquivada:** Restaurar e Excluir definitivamente falham com **"A coluna de origem está arquivada. Restaure a coluna primeiro."** No detalhe, esse aviso aparece no topo e os dois botões ficam desabilitados.

### Tarefa de quadro arquivado
- Aviso "Quadro arquivado · somente leitura". Nada é editável e o rodapé não tem ações.

### Estados do detalhe
- **Carregando:** *skeleton* dos campos.
- **Erro:** "Não foi possível carregar" + Tentar novamente.
- **Não encontrada** (tarefa inexistente ou excluída em outro dispositivo): o conteúdo vira "Esta tarefa não existe mais" + Fechar.

---

## 8. Etiquetas do quadro

- Cada quadro tem as próprias etiquetas.
- Acesso pelo menu (…) do cabeçalho do quadro → **Etiquetas do quadro**, ou pelo link "Gerenciar etiquetas" do popover. Endereço `/b/{quadro}/labels`. O caminho fica "Meus quadros › Product launch › Etiquetas".
- Lista na **ordem de criação**, com a etiqueta e "usada em N tarefas".
- **Nova etiqueta / Editar etiqueta:** nome + cor escolhida entre as **10 cores fixas**, com o nome da cor selecionada e uma prévia.
  - Erros: "Dê um nome à etiqueta" · "Use até 50 caracteres" · "Já existe uma etiqueta com esse nome neste quadro" (sem diferenciar maiúsculas).
- **Excluir:** "Excluir a etiqueta Bug? Ela será removida de 2 tarefas."
- Vazia: "Nenhuma etiqueta ainda".
- Em quadro arquivado, a tela é somente leitura.

### Cores (ordem e nomes da API)

| API | Hex | PT | EN |
|---|---|---|---|
| `purple` | #8E24AA | Roxo | Purple |
| `blue` | #2563EB | Azul | Blue |
| `sky` | #0891B2 | Céu | Sky |
| `green` | #16A34A | Verde | Green |
| `lime` | #65A30D | Lima | Lime |
| `yellow` | #CA8A04 | Amarelo | Yellow |
| `orange` | #EA580C | Laranja | Orange |
| `red` | #DC2626 | Vermelho | Red |
| `pink` | #DB2777 | Rosa | Pink |
| `black` | #374151 | Preto | Black |

---

## 9. Configurações

- **Idioma:** Português (Brasil) · English. A troca é imediata.
- **Tema:** Claro · Escuro · Sistema (segue o aparelho).
- **Atalhos de teclado** (só no desktop).
- **Sessão:** "Conectado como Demo · demo@example.com" + **Sair**.

---

## 10. Salvamento e falhas

Toda mudança é **otimista**: aparece na hora e é confirmada em seguida.

- **Itens novos** (quadro, coluna, tarefa, item de checklist, etiqueta) ficam *pendentes* até a confirmação: atenuados e com um ícone girando.
- Botões de envio ficam desabilitados enquanto há um envio em andamento.
- **Falha** em criar, editar, arquivar, restaurar ou excluir: a mudança é desfeita na tela e aparece o aviso "Não foi possível salvar. Tente novamente." com o botão **Tentar novamente**.
- **Mover tarefa que falha:** o card volta à posição anterior, com "Não foi possível mover a tarefa".
- **Item arquivado em outro dispositivo** (resposta **409**): a mudança é desfeita e aparece "Este item foi arquivado. Recarregue para ver o estado atual." com o botão **Recarregar**, que busca o estado atual.

---

## 11. Atalhos (web)

| Tecla | Ação |
|---|---|
| `n` | Nova tarefa na primeira coluna |
| `/` | Buscar no quadro |
| `Esc` | Fecha a camada mais interna: diálogo → menu/popover → edição de item → detalhe → campos no lugar |
| `Espaço` | Pega e solta o card, a coluna (cabeçalho) ou o item de checklist (alça) em foco |
| `?` | Mostra os atalhos (também pelo ícone de teclado no topo) |

Em quadro arquivado, `n` e o `Espaço` para arrastar não fazem nada.

---

## 12. Avisos (toasts)

Aparecem embaixo, no centro, por cerca de 3 segundos (7 segundos quando têm botão), e **não têm Desfazer**:

- Quadro criado, salvo, arquivado, restaurado ou excluído definitivamente
- Coluna criada, renomeada, arquivada, restaurada ou excluída definitivamente
- Tarefa criada, arquivada, restaurada ou excluída definitivamente
- Tarefa movida para…
- Etiqueta criada, salva ou excluída
- Conta criada
- Erros: "Não foi possível salvar. Tente novamente." (com **Tentar novamente**) · "Não foi possível mover a tarefa" · "Este item foi arquivado. Recarregue para ver o estado atual." (com **Recarregar**) · "A coluna de origem está arquivada. Restaure a coluna primeiro."

---

## 13. Acessibilidade

- Contraste WCAG 2.1 AA com os tokens do Púrpura nos dois temas.
- Foco visível em todos os elementos interativos: cards, botões, campos e itens de menu.
- Todo botão que tem só ícone tem rótulo (`aria-label`). O checkbox de concluída tem o rótulo "Concluída" para leitores de tela.
- O detalhe é um diálogo modal (`aria-modal`). Menus usam `role="menu"`. Os filtros de etiqueta usam `menuitemcheckbox`. As cores da etiqueta são um `radiogroup`, cada uma com o nome da cor.
- O arraste por teclado é anunciado em uma região viva.

---

## 14. Formatos

- Data completa: "12 out, 2026" em PT e "Oct 12, 2026" em EN.
- Nos cards: "Hoje", "Amanhã", "Ontem" ou "12 out" (com o ano quando não é o ano atual).

---

## 15. Dados de exemplo

Iguais ao *seed* do servidor. Em EN os dados ficam como estão, sem tradução.

**Conta:** Demo · demo@example.com / demo1234.

**Product launch** — descrição "Everything left before the public release." Etiquetas: Bug (red), Feature (green), Design (purple), Urgent (orange).

| Coluna | Tarefa | Detalhes |
|---|---|---|
| To do | Write release notes | Feature; vence em 3 dias; descrição "Summarize every feature shipped since the beta." |
| To do | Fix login on Safari | Bug, Urgent; **atrasada** (venceu ontem); descrição "The session is lost after a page reload." |
| To do | Pick the landing page hero image | Design |
| To do | Translate the onboarding emails | **arquivada**; aparece só na coluna virtual Arquivadas, "de: To do" |
| Doing | Polish the board screen | Design, Feature; **vence hoje**; descrição "Spacing, empty states and keyboard focus."; checklist com os dois primeiros itens marcados (**2/3**) |
| Doing | Set up error monitoring | sem etiqueta; checklist: Create the project ✓ · Add the source maps upload (**1/2**) |
| Done | Register and login | Feature; **concluída** |
| Done | Archive boards | Feature; **concluída** |

**Personal** — sem descrição. Etiquetas: Home (blue), Health (lime).

| Coluna | Tarefa | Detalhes |
|---|---|---|
| This week | Book a dentist appointment | Health; sem prazo |
| This week | Buy groceries | Home; checklist: Coffee · Bread ✓ · Fruit (**1/3**) |
| Someday | Learn to play the guitar | — |

**Old side project** (arquivado) — descrição "Archived to show how an archived board looks." Coluna Ideas: Rewrite it in a weekend.

---

## 16. Controles do protótipo

Barra acima do app:

- **Tela:** Criar conta · Entrar · Entrar (muitas tentativas) · Sessão expirada · App
- **Dispositivo:** Desktop · Celular
- **Tema:** Claro · Escuro · Sistema
- **Idioma:** PT-BR · EN
- **Dados:** Exemplo · Vazio · Carregando · Erro. Carregando e Erro valem para a tela aberta: Meus quadros, Quadro ou Detalhe.
- **Tela → Sessão expirada** a partir do App simula uma resposta 401 em uso e guarda a tela atual para voltar depois do login.
- **Simular:**
  - **Arraste (mouse):** mostra um card "em voo" sobre a coluna seguinte, com a origem tracejada.
  - **Arraste (teclado):** pega um card e o leva para a próxima coluna, com a faixa explicativa e o anúncio.
  - **Filtros ativos:** abre o Product launch filtrado pela etiqueta Feature.
  - **Falhas ao salvar:** toda mudança falha, é desfeita e mostra o aviso com Tentar novamente.
  - **Item arquivado (409):** abre "Polish the board screen" (Product launch); a próxima escrita é desfeita com o aviso de item arquivado. **Recarregar** mostra a tarefa já arquivada.
  - **Quadro não encontrado:** abre `/b/b-404`.
  - **Tarefa não encontrada:** abre o detalhe de uma tarefa que não existe.

---

## 17. Implementação visual (Tailwind CSS)

- Tailwind CSS v4 pelo build de navegador, versão fixa `@tailwindcss/browser@4.1.11`.
- Os tokens do Púrpura (`tokens/*.css`) são a fonte da verdade. O `@theme` aponta para as variáveis existentes: cores (`--color-brand: var(--brand)`, `--color-border-default: var(--border-default)`…), fontes, tamanhos de texto, entrelinhas, raios, sombras, espaçamento (`--spacing: var(--space-1)`), curvas e durações (`--dur-*`, `--ease-*`). As cores ficam em `@theme inline` para seguir o tema escuro.
- As paletas padrão do Tailwind (cores, sombras, raios e tamanhos de texto) estão desligadas: só existem utilitários ligados aos tokens. Nenhuma cor hex nem valor arbitrário nas classes.
- Tema escuro: `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));`. O atributo `data-theme` segue a opção Claro · Escuro · Sistema.
- As 10 cores de etiqueta viram tokens `--label-*` e utilitários `bg-label-{cor}`.
- `@utility` + `@apply` só para padrões muito repetidos: campo (`tl-field`), card (`tl-card`), chip de etiqueta (`tl-chip`), menu e item de menu (`tl-menu`, `tl-menu-item`), painel (`tl-panel`).
- Tamanhos fora da escala do Púrpura foram ajustados para o token mais próximo (ex.: títulos de 26 px → 28 px, raio das colunas 12 px → 10 px).
