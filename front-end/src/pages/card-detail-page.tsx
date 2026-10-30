import { useParams } from 'react-router';

import { CardDetail } from '@/features/board';

export function CardDetailPage() {
  const { boardId, cardId } = useParams<{ boardId: string; cardId: string }>();

  // Keyed by card so drafts and dialogs reset when another card opens.
  return <CardDetail key={cardId} boardId={boardId!} cardId={cardId!} />;
}
