import type { paths } from '@my-trello/api-contract';
import createClient, { type Middleware } from 'openapi-fetch';

export type ApiClient = ReturnType<typeof createClient<paths>>;

export type ApiClientOptions = {
  baseUrl: string;
  getToken(): string | null;
  onSessionExpired(): void;
  fetch?: typeof fetch;
};

// A 401 here means wrong credentials, not an expired session (FND-15).
const PUBLIC_AUTH_PATHS: ReadonlySet<string> = new Set([
  '/api/v1/auth/login',
  '/api/v1/auth/register',
]);

export function createApiClient(options: ApiClientOptions): ApiClient {
  const client = createClient<paths>({
    baseUrl: options.baseUrl,
    fetch: options.fetch,
  });
  client.use(authMiddleware(options));
  return client;
}

function authMiddleware({
  getToken,
  onSessionExpired,
}: ApiClientOptions): Middleware {
  return {
    onRequest({ request }) {
      const token = getToken();
      if (token !== null) {
        request.headers.set('Authorization', `Bearer ${token}`);
      }
      return request;
    },
    onResponse({ request, response, schemaPath }) {
      if (
        response.status === 401 &&
        request.headers.has('Authorization') &&
        !PUBLIC_AUTH_PATHS.has(schemaPath)
      ) {
        onSessionExpired();
      }
      return response;
    },
  };
}
