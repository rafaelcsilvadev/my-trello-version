import { useQuery } from '@tanstack/react-query';

import { useApi } from '@/shared/api/api-context';
import { type ApiError, call } from '@/shared/api/api-error';

import type { UserResponse } from '../model/types';
import { authKeys } from './keys';

export function useCurrentUser() {
  const api = useApi();

  return useQuery<UserResponse, ApiError>({
    queryKey: authKeys.me,
    queryFn: () => call(api.GET('/api/v1/me')),
  });
}
