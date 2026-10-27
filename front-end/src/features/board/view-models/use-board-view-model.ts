import { useMemo, useState } from 'react';

import { useBoard, useCards, useLabels, useLists } from '../api/queries';
import { toColumns } from '../model/columns';
import { todayParts } from '../model/due-date';
import type { Label } from '../model/types';

export type BoardStatus = 'loading' | 'ready' | 'error' | 'notFound';

export function useBoardViewModel(boardId: string) {
  const board = useBoard(boardId);
  const lists = useLists(boardId, false);
  const cards = useCards(boardId, false);
  const labels = useLabels(boardId);
  const queries = [board, lists, cards, labels];
  // Read once, so the due labels do not change while the board is open.
  const [today] = useState(() => todayParts());

  const columns = useMemo(
    () => toColumns(lists.data ?? [], cards.data ?? []),
    [lists.data, cards.data],
  );
  const labelsById = useMemo(
    () => new Map<string, Label>(labels.data?.map((l) => [l.id, l]) ?? []),
    [labels.data],
  );

  // A deleted board also makes its lists and cards answer 404 (FBV-11).
  let status: BoardStatus = 'ready';
  if (queries.some((q) => q.error?.status === 404)) status = 'notFound';
  else if (queries.some((q) => q.isError)) status = 'error';
  else if (queries.some((q) => q.isPending)) status = 'loading';

  return {
    state: {
      status,
      board: board.data,
      readOnly: board.data !== undefined && board.data.archivedAt !== null,
      columns,
      labelsById,
      today,
    },
    actions: {
      // Only the failed requests run again (FBV-10).
      retryLoad: () => {
        for (const query of queries) if (query.isError) void query.refetch();
      },
    },
  };
}
