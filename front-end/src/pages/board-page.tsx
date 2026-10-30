import { Outlet, useParams } from 'react-router';

import { BoardScreen } from '@/features/board';

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();

  // Port of the prototype content container (design/Task List.dc.html:1184):
  // the board drops the max width so columns use the whole window.
  // Keyed by board so its toggles reset when moving between boards (FBV-33).
  // The card detail opens in the outlet, so the board stays mounted (FCD-05).
  return (
    <main className="mx-auto w-full min-w-0 px-4 pt-4 pb-6 md:px-8 md:pt-7 md:pb-10">
      <BoardScreen key={boardId} boardId={boardId!} />
      <Outlet />
    </main>
  );
}
