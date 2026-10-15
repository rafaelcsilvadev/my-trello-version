import { PasswordHasher } from '../../../src/auth/password-hasher';

const PASSWORD = 'correct horse battery staple';

describe('PasswordHasher', () => {
  const hasher = new PasswordHasher();

  it('returns a self-describing argon2id hash that differs from the password', async () => {
    const stored = await hasher.hash(PASSWORD);

    expect(stored).not.toBe(PASSWORD);
    expect(stored).not.toContain(PASSWORD);
    expect(stored).toMatch(
      /^argon2id\$m=19456,t=2,p=1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/,
    );
  });

  it('uses a 16-byte salt and a 32-byte tag', async () => {
    const [, , salt, tag] = (await hasher.hash(PASSWORD)).split('$');

    expect(Buffer.from(salt, 'base64')).toHaveLength(16);
    expect(Buffer.from(tag, 'base64')).toHaveLength(32);
  });

  it('produces a different hash for the same password on each call', async () => {
    const first = await hasher.hash(PASSWORD);
    const second = await hasher.hash(PASSWORD);

    expect(first).not.toBe(second);
  });

  it('verifies the right password', async () => {
    const stored = await hasher.hash(PASSWORD);

    await expect(hasher.verify(PASSWORD, stored)).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const stored = await hasher.hash(PASSWORD);

    await expect(hasher.verify(`${PASSWORD}!`, stored)).resolves.toBe(false);
  });

  it('rejects a password that differs only in case', async () => {
    const stored = await hasher.hash('Password123');

    await expect(hasher.verify('password123', stored)).resolves.toBe(false);
  });

  it.each([
    ['an empty string', ''],
    ['plain text', 'not-a-hash'],
    [
      'another algorithm',
      'argon2i$m=19456,t=2,p=1$c2FsdHNhbHRzYWx0c2FsdA==$dGFn',
    ],
    ['missing parameters', 'argon2id$$c2FsdHNhbHRzYWx0c2FsdA==$dGFn'],
    [
      'non-numeric parameters',
      'argon2id$m=abc,t=2,p=1$c2FsdHNhbHRzYWx0c2FsdA==$dGFn',
    ],
    [
      'out-of-range parameters',
      'argon2id$m=19456,t=2,p=0$c2FsdHNhbHRzYWx0c2FsdA==$dGFn',
    ],
    ['a missing tag', 'argon2id$m=19456,t=2,p=1$c2FsdHNhbHRzYWx0c2FsdA=='],
    [
      'an extra segment',
      'argon2id$m=19456,t=2,p=1$c2FsdHNhbHRzYWx0c2FsdA==$dGFn$x',
    ],
  ])('rejects a malformed stored hash: %s', async (_case, stored) => {
    await expect(hasher.verify(PASSWORD, stored)).resolves.toBe(false);
  });

  it('rejects a stored hash whose tag was truncated', async () => {
    const stored = await hasher.hash(PASSWORD);
    const [algorithm, params, salt, tag] = stored.split('$');
    const truncatedTag = Buffer.from(tag, 'base64')
      .subarray(0, 16)
      .toString('base64');

    await expect(
      hasher.verify(
        PASSWORD,
        [algorithm, params, salt, truncatedTag].join('$'),
      ),
    ).resolves.toBe(false);
  });

  it('verifies with the parameters recorded in the stored hash', async () => {
    const stored = await hasher.hash(PASSWORD);
    const tampered = stored.replace('t=2', 't=3');

    await expect(hasher.verify(PASSWORD, tampered)).resolves.toBe(false);
  });

  it('resolves false when verifying against the dummy hash', async () => {
    await expect(hasher.verifyAgainstDummy(PASSWORD)).resolves.toBe(false);
  });
});
