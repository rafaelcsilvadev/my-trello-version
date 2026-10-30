import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import type { ApiError } from '@/shared/api/api-error';
import { useSaveFailureNotifier } from '@/shared/ui/toast/use-save-failure-notifier';

import { useCardDetail } from '../api/card-detail-queries';
import {
  type UpdateCardVariables,
  useArchiveCard,
  useDeleteCard,
  useRestoreCard,
  useUpdateCard,
} from '../api/card-mutations';
import { boardViewKeys } from '../api/keys';
import { useMoveCard, usePendingItemIds } from '../api/mutations';
import { useBoard, useCards, useLabels, useLists } from '../api/queries';
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
  // Only for the end position of a move; the detail does not wait for it.
  const activeCards = useCards(boardId, false);
  // Read once, so the due labels do not change while the detail is open.
  const [today] = useState(() => todayParts());
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const updateCardMutation = useUpdateCard(boardId);
  const moveCardMutation = useMoveCard(boardId);
  const archiveCardMutation = useArchiveCard(boardId);
  const restoreCardMutation = useRestoreCard(boardId);
  const deleteCardMutation = useDeleteCard(boardId);
  const pendingIds = usePendingItemIds();
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
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

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

  // The end of the chosen column, as the board's "Mover para…" does (FCD-31, FCD-32).
  function moveTo(listId: string) {
    setIsMoveOpen(false);
    const target = lists.data?.find((item) => item.id === listId);
    if (!card.data || !activeCards.data || !target) return;
    if (card.data.listId === listId) return;
    const position = activeCards.data.filter(
      (item) => item.listId === listId && item.archivedAt === null,
    ).length;
    runChange(
      moveCardMutation.mutateAsync,
      { id: card.data.id, body: { listId, position } },
      t('board.toast.cardMoved', { col: target.title }),
      { retryMessage: t('board.toast.moveFailed') },
    );
  }

  // Leaves at once: the card is archived, so there are no drafts to lose (FCD-38).
  // The card query is not removed here: the detail renders once more before the
  // route change unmounts it and would fetch it again. Its `gcTime: 0` drops it.
  function confirmDelete() {
    setIsDeleteOpen(false);
    navigate(`/b/${boardId}`);
    runChange(
      deleteCardMutation.mutateAsync,
      { id: cardId },
      t('board.toast.cardDeleted'),
      { conflictMessage: t('board.errors.columnArchived') },
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
      isPending: pendingIds.has(cardId),
      isMoveOpen,
      isDeleteOpen,
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
      openMove: () => setIsMoveOpen(true),
      closeMove: () => setIsMoveOpen(false),
      moveTo,
      archive: () =>
        runChange(
          archiveCardMutation.mutateAsync,
          { id: cardId },
          t('board.toast.cardArchived'),
        ),
      // A card of an archived column answers `409` (FCD-51).
      restore: () =>
        runChange(
          restoreCardMutation.mutateAsync,
          { id: cardId },
          t('board.toast.cardRestored'),
          { conflictMessage: t('board.errors.columnArchived') },
        ),
      askDelete: () => setIsDeleteOpen(true),
      cancelDelete: () => setIsDeleteOpen(false),
      confirmDelete,
      // Only the failed requests run again (FCD-10).
      retryLoad: () => {
        for (const query of queries) if (query.isError) void query.refetch();
      },
    },
  };
}
