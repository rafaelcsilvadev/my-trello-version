import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { useSession } from '@/shared/session/session-context';

export function useSignOut(): () => Promise<void> {
  const session = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Token first so the /login guard lets us through; cache last so the
  // still-mounted page's queries do not refetch without a token.
  return async () => {
    session.clear();
    await navigate('/login');
    queryClient.clear();
  };
}
