import type { IncomingMessage, ServerResponse } from 'node:http';
import { genReqId } from '../../../src/logging/request-id';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function requestIdFor(header?: string): string {
  const headers = header === undefined ? {} : { 'x-request-id': header };
  return genReqId(
    { headers } as IncomingMessage,
    { setHeader: jest.fn() } as unknown as ServerResponse,
  );
}

describe('genReqId', () => {
  it('reuses a non-empty X-Request-Id header', () => {
    expect(requestIdFor('abc')).toBe('abc');
  });

  it('reuses an X-Request-Id header of exactly 128 characters', () => {
    const header = 'a'.repeat(128);

    expect(requestIdFor(header)).toBe(header);
  });

  it('generates a UUID v4 when the header is missing', () => {
    expect(requestIdFor()).toMatch(UUID_V4);
  });

  it('generates a UUID v4 when the header is empty', () => {
    expect(requestIdFor('')).toMatch(UUID_V4);
  });

  it('generates a UUID v4 when the header is longer than 128 characters', () => {
    expect(requestIdFor('a'.repeat(129))).toMatch(UUID_V4);
  });
});
