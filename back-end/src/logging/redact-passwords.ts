const CENSOR = '[REDACTED]';

// pino redact paths allow one wildcard per segment, so they cannot reach a
// `password` key at any depth. The input is parsed JSON: plain objects,
// arrays and primitives only.
export function redactPasswords(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactPasswords);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, field]) => [
      key,
      key === 'password' ? CENSOR : redactPasswords(field),
    ]),
  );
}

// Runs on the final JSON line (pino `hooks.streamWrite`), after serializers
// and child bindings, so class instances such as DTOs are plain JSON here.
export const redactLogLine = (line: string): string =>
  `${JSON.stringify(redactPasswords(JSON.parse(line)))}\n`;
