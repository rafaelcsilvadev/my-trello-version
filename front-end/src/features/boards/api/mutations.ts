import type { Board } from '@my-trello/api-contract';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useApi } from '@/shared/api/api-context';
import { type ApiError, call } from '@/shared/api/api-error';

import type { CreateBoardDto } from '../model/types';
import { boardKeys } from './keys';

export function useCreateBoard() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation<Board, ApiError, CreateBoardDto>({
    mutationFn: (body) => call(api.POST('/api/v1/boards', { body })),
    // A new board is always active; the archived list cannot change.
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: boardKeys.list(false) }),
  });
}
