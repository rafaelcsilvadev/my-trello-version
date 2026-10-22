const FALLBACK_PATH = '/boards';

// Browsers read `//host` and `/\host` as another origin, so only a single leading slash is same-app.
export function safeRedirect(value: string | null): string {
  if (
    !value?.startsWith('/') ||
    value.startsWith('//') ||
    value.startsWith('/\\')
  ) {
    return FALLBACK_PATH;
  }
  return value;
}
