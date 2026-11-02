import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSaveFailureNotifier } from '@/shared/ui/toast/use-save-failure-notifier';

import { useMoveChecklistItem } from '../api/checklist-mutations';
import {
  type ItemMoveSession,
  itemMoveBody,
  previewItems,
  stepItem,
} from '../model/checklist';
import type { MoveInput } from '../model/move';
import type { ChecklistItem } from '../model/types';

export type ChecklistMoveOptions = {
  // The saved items, sorted by position.
  items: ChecklistItem[];
  canMove: boolean;
  pendingIds: Set<string>;
  reload: () => void;
};

type MoveText = 'moveBanner' | 'moveAnnounce' | 'moveDropped';

// One move session shared by the mouse and the keyboard; a drop sends one optimistic move.
export function useChecklistMove(
  boardId: string,
  cardId: string,
  { items, canMove, pendingIds, reload }: ChecklistMoveOptions,
) {
  const { t } = useTranslation();
  const moveMutation = useMoveChecklistItem(boardId, cardId);
  const { runChange } = useSaveFailureNotifier(reload);
  const [session, setSession] = useState<ItemMoveSession | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const preview = useMemo(() => previewItems(items, session), [items, session]);

  // `i` counts from 1 at the item's current spot; `n` includes the item.
  function moveText(current: ItemMoveSession, text: MoveText) {
    const item = items.find((entry) => entry.id === current.id);
    return t(`board.cardDetail.checklist.${text}`, {
      text: item?.text ?? '',
      i: (current.target ?? current.origin) + 1,
      n: items.length,
    });
  }

  // Only a keyboard session talks: the mouse shows the move on its own.
  function announce(current: ItemMoveSession | null, text: MoveText) {
    if (current?.input === 'keyboard') {
      setAnnouncement(moveText(current, text));
    }
  }

  // FCLD-22, FCLD-23.
  function canDrag(id: string) {
    return canMove && !session && !pendingIds.has(id);
  }

  // FCLD-08; ignored unless `canDrag(id)`.
  function start(id: string, input: MoveInput) {
    if (!canDrag(id)) return;
    const origin = items.findIndex((item) => item.id === id);
    const next: ItemMoveSession = { id, input, origin, target: null };
    setSession(next);
    announce(next, 'moveAnnounce');
  }

  // FCLD-09, FCLD-10.
  function step(key: 'ArrowUp' | 'ArrowDown') {
    if (session?.input !== 'keyboard') return;
    const at = session.target ?? session.origin;
    const next = { ...session, target: stepItem(items.length, at, key) };
    setSession(next);
    announce(next, 'moveAnnounce');
  }

  // FCLD-04: the mouse only marks the drop index; the list keeps its order.
  function hover(index: number) {
    setSession((current) =>
      current?.input === 'mouse' ? { ...current, target: index } : current,
    );
  }

  // No success toast: the list already shows the move. A `null` body means the same index (FCLD-05, FCLD-06, FCLD-11–FCLD-13); failures toast through `runChange` (FCLD-18–FCLD-20).
  function drop() {
    setSession(null);
    announce(session, 'moveDropped');
    if (!session) return;
    const body = itemMoveBody(session.origin, session.target);
    if (body) {
      runChange(moveMutation.mutateAsync, { id: session.id, body }, null);
    }
  }

  // FCLD-14; a mouse cancel is silent (FCLD-06).
  function cancel() {
    setSession(null);
    if (session?.input === 'keyboard') {
      setAnnouncement(t('board.move.cancelled'));
    }
  }

  const keyboardSession = session?.input === 'keyboard' ? session : null;

  return {
    preview,
    bannerText: keyboardSession && moveText(keyboardSession, 'moveBanner'),
    announcement,
    keyboardItemId: keyboardSession?.id ?? null,
    canDrag,
    start,
    step,
    hover,
    drop,
    cancel,
  };
}
