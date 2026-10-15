import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createJwtOptions } from '../../../src/auth/auth.module';
import {
  EmailAlreadyRegisteredError,
  InvalidCredentialsError,
} from '../../../src/auth/auth.errors';
import { AuthService } from '../../../src/auth/auth.service';
import { PasswordHasher } from '../../../src/auth/password-hasher';
import { validateEnv, type Env } from '../../../src/config/env.schema';
import type { User } from '../../../src/users/user.entity';
import type { UsersRepository } from '../../../src/users/users.repository';

const NAME = 'Ada Lovelace';
const EMAIL = 'ada@example.com';
const PASSWORD = 'correct horse battery staple';

type UsersRepositoryMock = jest.Mocked<
  Pick<UsersRepository, 'create' | 'findByEmail'>
>;

function buildJwtService(env: Record<string, string> = {}): JwtService {
  const config = new ConfigService<Env, true>(
    validateEnv({
      DATABASE_URL: 'postgres://user:pass@localhost:5432/app',
      JWT_SECRET: 'a'.repeat(32),
      ...env,
    }),
  );
  return new JwtService(createJwtOptions(config));
}

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: '7f3c2a8e-1b4d-4c6e-9a0f-2d5b8c1e7a90',
    name: NAME,
    email: EMAIL,
    passwordHash: 'stored-hash',
    createdAt: new Date('2026-10-15T12:00:00Z'),
    ...overrides,
  };
}

describe('AuthService', () => {
  let users: UsersRepositoryMock;
  let hasher: PasswordHasher;
  let jwt: JwtService;
  let service: AuthService;

  beforeEach(() => {
    users = { create: jest.fn(), findByEmail: jest.fn() };
    hasher = new PasswordHasher();
    jwt = buildJwtService();
    service = new AuthService(users as unknown as UsersRepository, hasher, jwt);
  });

  describe('register', () => {
    it('stores a hash of the password, never the password itself', async () => {
      users.create.mockImplementation((input) =>
        Promise.resolve(buildUser(input)),
      );

      await service.register({ name: NAME, email: EMAIL, password: PASSWORD });

      expect(users.create).toHaveBeenCalledTimes(1);
      const [input] = users.create.mock.calls[0];
      expect(input).toEqual({
        name: NAME,
        email: EMAIL,
        passwordHash: expect.any(String),
      });
      expect(input).not.toHaveProperty('password');
      expect(input.passwordHash).not.toContain(PASSWORD);
      await expect(hasher.verify(PASSWORD, input.passwordHash)).resolves.toBe(
        true,
      );
    });

    it('returns the created user and an access token for it', async () => {
      const user = buildUser();
      users.create.mockResolvedValue(user);

      const result = await service.register({
        name: NAME,
        email: EMAIL,
        password: PASSWORD,
      });

      expect(result.user).toBe(user);
      await expect(jwt.verifyAsync(result.accessToken)).resolves.toMatchObject({
        sub: user.id,
      });
    });

    it('propagates EmailAlreadyRegisteredError from the repository', async () => {
      users.create.mockRejectedValue(new EmailAlreadyRegisteredError());

      await expect(
        service.register({ name: NAME, email: EMAIL, password: PASSWORD }),
      ).rejects.toBeInstanceOf(EmailAlreadyRegisteredError);
    });
  });

  describe('login', () => {
    it('returns the user and an access token when the password matches', async () => {
      const user = buildUser({ passwordHash: await hasher.hash(PASSWORD) });
      users.findByEmail.mockResolvedValue(user);

      const result = await service.login({ email: EMAIL, password: PASSWORD });

      expect(users.findByEmail).toHaveBeenCalledWith(EMAIL);
      expect(result.user).toBe(user);
      await expect(jwt.verifyAsync(result.accessToken)).resolves.toMatchObject({
        sub: user.id,
      });
    });

    it('rejects an unknown email with InvalidCredentialsError after a dummy verify', async () => {
      users.findByEmail.mockResolvedValue(null);
      const dummy = jest.spyOn(hasher, 'verifyAgainstDummy');

      await expect(
        service.login({ email: EMAIL, password: PASSWORD }),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
      expect(dummy).toHaveBeenCalledWith(PASSWORD);
    });

    it('rejects a wrong password with InvalidCredentialsError', async () => {
      users.findByEmail.mockResolvedValue(
        buildUser({ passwordHash: await hasher.hash(PASSWORD) }),
      );

      await expect(
        service.login({ email: EMAIL, password: `${PASSWORD}!` }),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
    });
  });

  describe('access token', () => {
    async function issueToken(): Promise<string> {
      users.create.mockResolvedValue(buildUser());
      const { accessToken } = await service.register({
        name: NAME,
        email: EMAIL,
        password: PASSWORD,
      });
      return accessToken;
    }

    it('is signed with HS256 and carries the user id as sub', async () => {
      const token = await issueToken();

      const decoded = jwt.decode<{ sub: string }>(token);
      const header = JSON.parse(
        Buffer.from(token.split('.')[0], 'base64url').toString(),
      ) as { alg: string };
      expect(header.alg).toBe('HS256');
      expect(decoded.sub).toBe(buildUser().id);
    });

    it('expires one hour after issue by default', async () => {
      const token = await issueToken();

      const { iat, exp } = jwt.decode<{ iat: number; exp: number }>(token);
      expect(exp - iat).toBe(3600);
    });

    it('expires after JWT_EXPIRES_IN when it is set', async () => {
      jwt = buildJwtService({ JWT_EXPIRES_IN: '15m' });
      service = new AuthService(
        users as unknown as UsersRepository,
        hasher,
        jwt,
      );

      const token = await issueToken();

      const { iat, exp } = jwt.decode<{ iat: number; exp: number }>(token);
      expect(exp - iat).toBe(900);
    });

    it('is rejected when signed with another secret', async () => {
      const token = await issueToken();
      const other = buildJwtService({ JWT_SECRET: 'b'.repeat(32) });

      await expect(other.verifyAsync(token)).rejects.toThrow();
    });
  });
});
