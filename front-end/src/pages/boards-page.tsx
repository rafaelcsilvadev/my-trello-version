import { useNavigate } from 'react-router';

import { BoardsScreen } from '@/features/boards';

export function BoardsPage() {
  const navigate = useNavigate();

  // A new board opens right away (FBRD-19).
  function handleCreated(id: string) {
    void navigate(`/b/${id}`);
  }

  return <BoardsScreen onCreated={handleCreated} />;
}
