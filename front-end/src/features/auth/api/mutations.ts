import { useMutation } from '@tanstack/react-query';

import { useApi } from '@/shared/api/api-context';
import { type ApiError, call } from '@/shared/api/api-error';
import { useSession } from '@/shared/session/session-context';

import type { AuthResponse, LogInValues, SignUpValues } from '../model/types';

export function useSignUp() {
  const api = useApi();
  const session = useSession();

  return useMutation<AuthResponse, ApiError, SignUpValues>({
    mutationFn: (body) => call(api.POST('/api/v1/auth/register', { body })),
    onSuccess: ({ accessToken }) => session.setToken(accessToken),
  });
}

export function useLogIn() {
  const api = useApi();
  const session = useSession();

  return useMutation<AuthResponse, ApiError, LogInValues>({
    mutationFn: (body) => call(api.POST('/api/v1/auth/login', { body })),
    onSuccess: ({ accessToken }) => session.setToken(accessToken),
  });
}
