// Every key starts with `all(boardId)`, so one invalidation reloads the whole board.
export const boardViewKeys = {
  all: (boardId: string) => ['board', boardId] as const,
  detail: (boardId: string) => ['board', boardId, 'detail'] as const,
  lists: (boardId: string, archived: boolean) =>
    ['board', boardId, 'lists', { archived }] as const,
  cards: (boardId: string, archived: boolean) =>
    ['board', boardId, 'cards', { archived }] as const,
  card: (boardId: string, cardId: string) =>
    ['board', boardId, 'card', cardId] as const,
  checklist: (boardId: string, cardId: string) =>
    ['board', boardId, 'checklist', cardId] as const,
  labels: (boardId: string) => ['board', boardId, 'labels'] as const,
  listCards: (boardId: string, listId: string) =>
    ['board', boardId, 'list-cards', listId] as const,
};
