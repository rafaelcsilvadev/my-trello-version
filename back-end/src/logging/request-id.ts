import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

const MAX_REQUEST_ID_LENGTH = 128;

// pino-http request id generator: keeps a caller's X-Request-Id so a trace can
// span services, and echoes the id back on every response.
export function genReqId(req: IncomingMessage, res: ServerResponse): string {
  const header = req.headers['x-request-id'];
  const id =
    typeof header === 'string' &&
    header.length > 0 &&
    header.length <= MAX_REQUEST_ID_LENGTH
      ? header
      : randomUUID();
  res.setHeader('X-Request-Id', id);
  return id;
}
