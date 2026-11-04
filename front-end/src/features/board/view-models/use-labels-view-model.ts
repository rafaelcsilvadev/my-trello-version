import { useMemo } from 'react';

import { useLabelUsage } from '../api/label-usage';
import { usePendingItemIds } from '../api/mutations';
import { useBoard, useLabels } from '../api/queries';
import { usageText } from '../model/label-usage';

export type LabelsStatus = 'loading' | 'ready' | 'error' | 'notFound';

export function useLabelsViewModel(boardId: string) {
  const board = useBoard(boardId);
  const labels = useLabels(boardId);
  const usage = useLabelUsage(boardId);
  const pendingIds = usePendingItemIds();

  // Rows wait for every usage source, so a count shown is never partial (FLP-05).
  const rows = useMemo(() => {
    const { counts } = usage;
    if (!labels.data || !counts) return [];
    return labels.data.map((label) => ({
      label,
      usage: usageText(counts.get(label.id) ?? 0),
      pending: pendingIds.has(label.id),
    }));
  }, [labels.data, usage, pendingIds]);

  // A failed refetch keeps the cached data on screen; only a read with nothing to show is an error.
  let status: LabelsStatus = 'ready';
  if ([board, labels].some((q) => q.error?.status === 404)) status = 'notFound';
  else if (
    [board, labels].some((q) => q.isError && q.data === undefined) ||
    (usage.isError && usage.counts === undefined)
  )
    status = 'error';
  else if (board.isPending || labels.isPending || usage.isLoading)
    status = 'loading';

  return {
    state: {
      status,
      board: board.data,
      readOnly: board.data !== undefined && board.data.archivedAt !== null,
      rows,
    },
    actions: {
      // Only the failed requests run again (FLP-06).
      retry: () => {
        for (const query of [board, labels])
          if (query.isError) void query.refetch();
        usage.refetch();
      },
    },
  };
}
