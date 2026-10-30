import type {
  Board,
  Card,
  ChecklistItem,
  Label,
  List,
} from '@/features/board/model/types';

const stamp = '2026-10-23T12:00:00.000Z';

export const boardId = '11111111-1111-4111-8111-111111111111';

export function boardFixture(overrides: Partial<Board> = {}): Board {
  return {
    id: boardId,
    title: 'Product launch',
    description: null,
    archivedAt: null,
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

export function listFixture(id: string, overrides: Partial<List> = {}): List {
  return {
    id,
    boardId,
    title: `List ${id}`,
    position: 0,
    archivedAt: null,
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

export function cardFixture(
  id: string,
  listId: string,
  overrides: Partial<Card> = {},
): Card {
  return {
    id,
    listId,
    title: `Card ${id}`,
    description: null,
    dueDate: null,
    done: false,
    position: 0,
    archivedAt: null,
    createdAt: stamp,
    updatedAt: stamp,
    labelIds: [],
    checklist: { total: 0, done: 0 },
    ...overrides,
  };
}

export function labelFixture(
  id: string,
  overrides: Partial<Label> = {},
): Label {
  return {
    id,
    boardId,
    name: `Label ${id}`,
    color: 'green',
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

export function checklistItem(
  id: string,
  cardId: string,
  overrides: Partial<ChecklistItem> = {},
): ChecklistItem {
  return {
    id,
    cardId,
    text: `Item ${id}`,
    done: false,
    position: 0,
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}
