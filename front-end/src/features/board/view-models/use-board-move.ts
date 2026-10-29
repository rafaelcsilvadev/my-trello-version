import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSaveFailureNotifier } from '@/shared/ui/toast/use-save-failure-notifier';

import { boardViewKeys } from '../api/keys';
import { useMoveCard, useMoveList } from '../api/mutations';
import {
  type ArrowKey,
  type CardSpot,
  cardMoveBody,
  cardSpot,
  type ColumnSpot,
  columnMoveBody,
  type MoveInput,
  type MoveSession,
  previewColumns,
  stepCard,
  stepColumn,
} from '../model/move';
import type { Column } from '../model/types';

export type BoardMoveOptions = {
  columns: Column[];
  canMove: boolean;
  // False while the board is filtered: no drag or pick, "Mover para…" still works (FBF-31, FBF-32, FBF-34).
  canDrag: boolean;
  pendingIds: Set<string>;
  // The column whose name is a field, so its header cannot be dragged (FDND-27).
  renamingListId: string | null;
};

function sessionAt(
  columns: Column[],
  kind: MoveSession['kind'],
  id: string,
  input: MoveInput,
): MoveSession | null {
  if (kind === 'card') {
    const origin = cardSpot(columns, id);
    return origin ? { kind, id, input, origin, target: null } : null;
  }
  const index = columns.findIndex((column) => column.list.id === id);
  return index === -1
    ? null
    : { kind, id, input, origin: { index }, target: null };
}

// A card session only takes a card spot, a column session only a column spot.
function withTarget(
  session: MoveSession,
  target: CardSpot | ColumnSpot,
): MoveSession {
  if (session.kind === 'card') {
    return 'listId' in target ? { ...session, target } : session;
  }
  return 'listId' in target ? session : { ...session, target };
}

function stepSession(
  columns: Column[],
  session: MoveSession,
  key: ArrowKey,
): MoveSession {
  if (session.kind === 'card') {
    const at = session.target ?? session.origin;
    return { ...session, target: stepCard(columns, session.id, at, key) };
  }
  if (key === 'ArrowUp' || key === 'ArrowDown') return session;
  const at = session.target ?? session.origin;
  return { ...session, target: stepColumn(columns.length, at, key) };
}

type MoveText = 'banner' | 'announce' | 'dropped';
type CardSession = Extract<MoveSession, { kind: 'card' }>;
type ColumnSession = Extract<MoveSession, { kind: 'column' }>;

const cardTexts = {
  banner: 'board.move.cardBanner',
  announce: 'board.move.cardAnnounce',
  dropped: 'board.move.cardDropped',
} as const;

const columnTexts = {
  banner: 'board.move.columnBanner',
  announce: 'board.move.columnAnnounce',
  dropped: 'board.move.columnDropped',
} as const;

// The texts name the item's current spot: positions count from 1 and `n` includes the item.
function cardValues(columns: Column[], session: CardSession) {
  const at = session.target ?? session.origin;
  const column = columns.find((item) => item.list.id === at.listId);
  const card = columns
    .flatMap((item) => item.cards)
    .find((item) => item.id === session.id);
  const others =
    column?.cards.filter((item) => item.id !== session.id).length ?? 0;
  return {
    title: card?.title ?? '',
    col: column?.list.title ?? '',
    i: at.index + 1,
    n: others + 1,
  };
}

function columnValues(columns: Column[], session: ColumnSession) {
  const at = session.target ?? session.origin;
  const column = columns.find((item) => item.list.id === session.id);
  return { name: column?.list.title ?? '', i: at.index + 1, n: columns.length };
}

// One move session shared by the mouse and the keyboard; dropping sends one optimistic move.
export function useBoardMove(
  boardId: string,
  { columns, canMove, canDrag, pendingIds, renamingListId }: BoardMoveOptions,
) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const moveCardMutation = useMoveCard(boardId);
  const moveListMutation = useMoveList(boardId);
  const { runChange } = useSaveFailureNotifier(
    () =>
      void queryClient.invalidateQueries({
        queryKey: boardViewKeys.all(boardId),
      }),
  );
  const [session, setSession] = useState<MoveSession | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [moveToCardId, setMoveToCardId] = useState<string | null>(null);

  function moveText(current: MoveSession, text: MoveText) {
    return current.kind === 'card'
      ? t(cardTexts[text], cardValues(columns, current))
      : t(columnTexts[text], columnValues(columns, current));
  }

  // Only a keyboard session talks: the mouse shows the move on its own.
  function announce(current: MoveSession | null, text: MoveText) {
    if (current?.input === 'keyboard') {
      setAnnouncement(moveText(current, text));
    }
  }

  const preview = useMemo(
    () => previewColumns(columns, session),
    [columns, session],
  );

  // FDND-40, FDND-41, FDND-27, FBF-31, FBF-32.
  function start(kind: MoveSession['kind'], id: string, input: MoveInput) {
    if (!canMove || !canDrag || session || pendingIds.has(id)) return;
    if (kind === 'column' && id === renamingListId) return;
    const next = sessionAt(columns, kind, id, input);
    setSession(next);
    announce(next, 'announce');
  }

  // FDND-10, FDND-11, FDND-12, FDND-23.
  function step(key: ArrowKey) {
    if (session?.input !== 'keyboard') return;
    const next = stepSession(columns, session, key);
    setSession(next);
    announce(next, 'announce');
  }

  function hover(target: CardSpot | ColumnSpot) {
    setSession((current) => current && withTarget(current, target));
  }

  // No success toast: the board already shows the move. A `null` body means the same spot (FDND-07, FDND-28).
  function drop() {
    setSession(null);
    announce(session, 'dropped');
    if (!session?.target) return;
    if (session.kind === 'card') {
      const body = cardMoveBody(session.origin, session.target);
      if (body) {
        runChange(
          moveCardMutation.mutateAsync,
          { id: session.id, body },
          null,
          { retryMessage: t('board.toast.moveFailed') },
        );
      }
      return;
    }
    const body = columnMoveBody(session.origin, session.target);
    if (body) {
      runChange(moveListMutation.mutateAsync, { id: session.id, body }, null);
    }
  }

  // FDND-14, FDND-25.
  function cancel() {
    setSession(null);
    if (session?.input === 'keyboard')
      setAnnouncement(t('board.move.cancelled'));
  }

  const moveToCard =
    columns
      .flatMap((column) => column.cards)
      .find((card) => card.id === moveToCardId) ?? null;

  // FDND-40.
  function askMoveTo(cardId: string) {
    if (canMove && !pendingIds.has(cardId)) setMoveToCardId(cardId);
  }

  function closeMoveTo() {
    setMoveToCardId(null);
  }

  // The card goes to the end of the chosen column; its own column sends nothing (FDND-31, FDND-32).
  function moveTo(listId: string) {
    setMoveToCardId(null);
    const column = columns.find((item) => item.list.id === listId);
    if (!moveToCard || !column || moveToCard.listId === listId) return;
    runChange(
      moveCardMutation.mutateAsync,
      { id: moveToCard.id, body: { listId, position: column.cards.length } },
      t('board.toast.cardMoved', { col: column.list.title }),
      { retryMessage: t('board.toast.moveFailed') },
    );
  }

  const banner =
    session?.input === 'keyboard' ? moveText(session, 'banner') : null;

  return {
    state: { session, preview, announcement, banner, moveToCard },
    actions: {
      start,
      hover,
      step,
      drop,
      cancel,
      askMoveTo,
      moveTo,
      closeMoveTo,
    },
  };
}
