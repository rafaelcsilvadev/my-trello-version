import { useMemo, useState } from 'react';

import { useCardDetail } from '../api/card-detail-queries';
import { useBoard, useLabels, useLists } from '../api/queries';
import { cardDetailMode, findCardList } from '../model/card-detail';
import { todayParts } from '../model/due-date';

export type CardDetailStatus = 'loading' | 'ready' | 'error' | 'notFound';

export function useCardDetailViewModel(boardId: string, cardId: string) {
  const card = useCardDetail(boardId, cardId);
  const board = useBoard(boardId);
  const lists = useLists(boardId, false);
  // Always loaded: the card may sit in an archived column (FCD-39).
  const archivedLists = useLists(boardId, true);
  const labels = useLabels(boardId);
  const queries = [card, board, lists, archivedLists, labels];
  // Read once, so the due labels do not change while the detail is open.
  const [today] = useState(() => todayParts());

  const list =
    card.data && lists.data && archivedLists.data
      ? findCardList(card.data, [...lists.data, ...archivedLists.data])
      : undefined;
  const mode =
    card.data && board.data ? cardDetailMode(card.data, board.data) : undefined;
  // Board label order, without the ids of deleted labels (FCD-29).
  const appliedLabels = useMemo(() => {
    const ids = new Set(card.data?.labelIds ?? []);
    return (labels.data ?? []).filter((label) => ids.has(label.id));
  }, [card.data?.labelIds, labels.data]);

  // A card whose list is in neither list of the board is of another board (FCD-11).
  let status: CardDetailStatus = 'ready';
  if (queries.some((q) => q.error?.status === 404)) status = 'notFound';
  else if (queries.some((q) => q.isError && q.data === undefined))
    status = 'error';
  else if (queries.some((q) => q.isPending)) status = 'loading';
  else if (list === undefined) status = 'notFound';

  return {
    state: {
      status,
      card: card.data,
      list,
      mode,
      isColumnArchived: list !== undefined && list.archivedAt !== null,
      labels: appliedLabels,
      today,
      activeLists: lists.data ?? [],
    },
    actions: {
      // Only the failed requests run again (FCD-10).
      retryLoad: () => {
        for (const query of queries) if (query.isError) void query.refetch();
      },
    },
  };
}
