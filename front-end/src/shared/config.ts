const DEFAULT_API_ORIGIN = 'http://localhost:3000';

export function resolveApiOrigin(env: { VITE_API_URL?: string }): string {
  const value = env.VITE_API_URL?.trim();
  if (!value) {
    return DEFAULT_API_ORIGIN;
  }
  return value.replace(/\/+$/, '');
}

export const apiOrigin = resolveApiOrigin(import.meta.env);
