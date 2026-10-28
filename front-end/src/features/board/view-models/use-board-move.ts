import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSaveFailureNotifier } from '@/shared/ui/toast/use-save-failure-notifier';

import { boardViewKeys } from '../api/keys';
import { useMoveCard, useMoveList } from '../api/mutations';
import {
  type CardSpot,
  cardMoveBody,
  cardSpot,
  type ColumnSpot,
  columnMoveBody,
  type MoveInput,
  type MoveSession,
  previewColumns,
} from '../model/move';
import type { Column } from '../model/types';

export type BoardMoveOptions = {
  columns: Column[];
  canMove: boolean;
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

// One move session shared by the mouse and the keyboard; dropping sends one optimistic move.
export function useBoardMove(
  boardId: string,
  { columns, canMove, pendingIds, renamingListId }: BoardMoveOptions,
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

  const preview = useMemo(
    () => previewColumns(columns, session),
    [columns, session],
  );

  // FDND-40, FDND-41, FDND-27.
  function start(kind: MoveSession['kind'], id: string, input: MoveInput) {
    if (!canMove || session || pendingIds.has(id)) return;
    if (kind === 'column' && id === renamingListId) return;
    setSession(sessionAt(columns, kind, id, input));
  }

  function hover(target: CardSpot | ColumnSpot) {
    setSession((current) => current && withTarget(current, target));
  }

  // No success toast: the board already shows the move. A `null` body means the same spot (FDND-07, FDND-28).
  function drop() {
    setSession(null);
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

  return {
    state: { session, preview },
    actions: {
      start,
      hover,
      drop,
      cancel: () => setSession(null),
    },
  };
}
