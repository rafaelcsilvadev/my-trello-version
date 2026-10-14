const CENSOR = '[REDACTED]';

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

// pino redact paths allow one wildcard per segment, so they cannot reach a
// `password` key at any depth. Only plain objects and arrays are walked;
// other instances (e.g. Errors) are returned as is.
export function redactPasswords(
  logged: Record<string, unknown>,
): Record<string, unknown> {
  const seen = new WeakSet<object>();

  const walk = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      if (seen.has(value)) return value;
      seen.add(value);
      return value.map(walk);
    }
    if (!isPlainObject(value)) return value;
    if (seen.has(value)) return value;
    seen.add(value);
    return Object.fromEntries(
      Object.entries(value).map(([key, field]) => [
        key,
        key === 'password' ? CENSOR : walk(field),
      ]),
    );
  };

  return walk(logged) as Record<string, unknown>;
}

// Runs on the final JSON line (pino `hooks.streamWrite`), after serializers
// and child bindings, so class instances such as DTOs are plain JSON here.
export const redactLogLine = (line: string): string =>
  `${JSON.stringify(redactPasswords(JSON.parse(line)))}\n`;
