import { useQueries } from '@tanstack/react-query';

import { useApi } from '@/shared/api/api-context';

import { countLabelUsage } from '../model/label-usage';
import { listCardsQuery, useCards, useLists } from './queries';

// The board's active-card call hides the cards of archived columns, so those
// come from one request per archived column (FLP-03). Counts wait for every
// source, so a number shown is never partial.
export function useLabelUsage(boardId: string) {
  const api = useApi();
  const activeCards = useCards(boardId, false);
  const archivedCards = useCards(boardId, true);
  const archivedLists = useLists(boardId, true);
  const columnCards = useQueries({
    queries: (archivedLists.data ?? []).map((list) =>
      listCardsQuery(api, boardId, list.id),
    ),
  });

  const sources = [activeCards, archivedCards, archivedLists, ...columnCards];
  const isError = sources.some((source) => source.isError);
  const cards = [activeCards.data, archivedCards.data];
  const columns = columnCards.map((column) => column.data);
  const counts =
    archivedLists.data &&
    !cards.includes(undefined) &&
    !columns.includes(undefined)
      ? countLabelUsage([...cards, ...columns].filter((c) => c !== undefined))
      : undefined;

  return {
    counts,
    isLoading: counts === undefined && !isError,
    isError,
    refetch: () => {
      for (const source of sources) {
        if (source.isError) void source.refetch();
      }
    },
  };
}
