import {
  redactLogLine,
  redactPasswords,
} from '../../../src/logging/redact-passwords';

describe('redactPasswords', () => {
  it('redacts a top-level password field', () => {
    expect(redactPasswords({ name: 'kept', password: 'p' })).toEqual({
      name: 'kept',
      password: '[REDACTED]',
    });
  });

  it('redacts a password field nested three levels deep', () => {
    expect(redactPasswords({ a: { b: { c: { password: 'p' } } } })).toEqual({
      a: { b: { c: { password: '[REDACTED]' } } },
    });
  });

  it('redacts password fields inside array items', () => {
    expect(
      redactPasswords({ users: [{ password: 'p1' }, { password: 'p2' }] }),
    ).toEqual({
      users: [{ password: '[REDACTED]' }, { password: '[REDACTED]' }],
    });
  });

  it('does not mutate the logged object', () => {
    const logged = { user: { password: 'p' } };

    redactPasswords(logged);

    expect(logged.user.password).toBe('p');
  });
});

describe('redactLogLine', () => {
  it('redacts password fields in a serialized log line and keeps the newline', () => {
    const line =
      '{"level":30,"password":"p","user":{"password":"p"},"msg":"x"}\n';

    expect(redactLogLine(line)).toBe(
      '{"level":30,"password":"[REDACTED]","user":{"password":"[REDACTED]"},"msg":"x"}\n',
    );
  });
});
