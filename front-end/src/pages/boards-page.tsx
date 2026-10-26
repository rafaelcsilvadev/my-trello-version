import { useNavigate } from 'react-router';

import { BoardsScreen } from '@/features/boards';

export function BoardsPage() {
  const navigate = useNavigate();

  // A new board opens right away (FBRD-19).
  function handleCreated(id: string) {
    void navigate(`/b/${id}`);
  }

  // Port of the prototype content container (design/Task List.dc.html:1184).
  return (
    <main className="mx-auto w-full max-w-270 px-4 pt-4 pb-6 md:px-8 md:pt-7 md:pb-10">
      <BoardsScreen onCreated={handleCreated} />
    </main>
  );
}
