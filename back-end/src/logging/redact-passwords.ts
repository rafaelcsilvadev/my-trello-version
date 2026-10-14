const CENSOR = '[REDACTED]';

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

// pino redact paths allow one wildcard per segment, so they cannot reach a
// `password` key at any depth. Only plain objects and arrays are walked;
// Errors and other instances are kept as is for pino's serializers.
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
