import { useParams } from 'react-router';

import { LabelsScreen } from '@/features/board';

export function LabelsPage() {
  const { boardId } = useParams<{ boardId: string }>();

  // Same container as the board page. Keyed by board so the open dialogs
  // reset when moving between boards (FLP-08).
  return (
    <main className="mx-auto w-full min-w-0 px-4 pt-4 pb-6 md:px-8 md:pt-7 md:pb-10">
      <LabelsScreen key={boardId} boardId={boardId!} />
    </main>
  );
}
