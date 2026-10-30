import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import type { ApiError } from '@/shared/api/api-error';
import { useSaveFailureNotifier } from '@/shared/ui/toast/use-save-failure-notifier';

import { useCardDetail } from '../api/card-detail-queries';
import { type UpdateCardVariables, useUpdateCard } from '../api/card-mutations';
import { boardViewKeys } from '../api/keys';
import { useBoard, useLabels, useLists } from '../api/queries';
import {
  cardDetailMode,
  descriptionBody,
  findCardList,
  isDescriptionTooLong,
  isDirty,
} from '../model/card-detail';
import { todayParts } from '../model/due-date';
import { mapTitleServerError } from '../model/errors';
import type { ItemFieldError, UpdateCardDto } from '../model/types';
import { validateCardTitle } from '../model/validation';

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
  const queryClient = useQueryClient();
  const updateCardMutation = useUpdateCard(boardId);
  // The cache rollback is done by the mutation hooks; this only tells the user (FCD-47–FCD-49).
  const { notify, runChange } = useSaveFailureNotifier(
    () =>
      void queryClient.invalidateQueries({
        queryKey: boardViewKeys.all(boardId),
      }),
  );
  // `null` shows the saved value.
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<ItemFieldError | null>(null);
  const [descriptionDraft, setDescriptionDraft] = useState<string | null>(null);

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

  const descriptionError =
    descriptionDraft !== null && isDescriptionTooLong(descriptionDraft)
      ? 'cardDescriptionTooLong'
      : null;

  // Done, title, due date and description save silently (FBV-31 rule).
  function save(body: UpdateCardDto) {
    if (!card.data) return;
    runChange(updateCardMutation.mutateAsync, { id: card.data.id, body }, null);
  }

  // The draft clears before the request, since the cache patch already shows the text.
  // On failure `restore` brings the typed text back as a draft (FCD-50) and returns
  // `true` when it showed the failure as a field message, so no toast follows.
  function saveDraft(
    variables: UpdateCardVariables,
    restore: (err: ApiError) => boolean,
  ) {
    updateCardMutation.mutateAsync(variables).catch((err: ApiError) => {
      if (restore(err)) return;
      notify(err, () =>
        runChange(updateCardMutation.mutateAsync, variables, null),
      );
    });
  }

  function submitTitle() {
    if (!card.data || titleDraft === null) return;
    const raw = titleDraft;
    const invalid = validateCardTitle(raw);
    if (invalid) {
      setTitleError(invalid);
      return;
    }
    setTitleDraft(null);
    setTitleError(null);
    const title = raw.trim();
    if (title === card.data.title) return;
    saveDraft({ id: card.data.id, body: { title } }, (err) => {
      setTitleDraft(raw);
      const fieldError = mapTitleServerError(err, raw, 'card');
      setTitleError(fieldError);
      return fieldError !== null;
    });
  }

  function saveDescription() {
    if (!card.data || descriptionDraft === null || descriptionError) return;
    const draft = descriptionDraft;
    setDescriptionDraft(null);
    saveDraft(
      { id: card.data.id, body: { description: descriptionBody(draft) } },
      () => {
        setDescriptionDraft(draft);
        return false;
      },
    );
  }

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
      titleDraft,
      titleError,
      descriptionDraft,
      descriptionError,
      isDirty:
        card.data !== undefined &&
        isDirty(card.data, {
          title: titleDraft,
          description: descriptionDraft,
        }),
    },
    actions: {
      toggleDone: () => card.data && save({ done: !card.data.done }),
      setTitleDraft,
      submitTitle,
      cancelTitle: () => {
        setTitleDraft(null);
        setTitleError(null);
      },
      // `value` is `YYYY-MM-DD` (FCD-21).
      setDueDate: (value: string) => save({ dueDate: value }),
      removeDueDate: () => save({ dueDate: null }),
      setDescriptionDraft,
      saveDescription,
      cancelDescription: () => setDescriptionDraft(null),
      // Only the failed requests run again (FCD-10).
      retryLoad: () => {
        for (const query of queries) if (query.isError) void query.refetch();
      },
    },
  };
}
