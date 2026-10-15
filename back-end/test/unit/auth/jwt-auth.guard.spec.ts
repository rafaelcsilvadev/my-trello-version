import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createJwtOptions } from '../../../src/auth/auth.module';
import { JwtAuthGuard } from '../../../src/auth/jwt-auth.guard';
import { IS_PUBLIC } from '../../../src/auth/public.decorator';
import { validateEnv, type Env } from '../../../src/config/env.schema';
import type { User } from '../../../src/users/user.entity';
import type { UsersRepository } from '../../../src/users/users.repository';

const SECRET = 'a'.repeat(32);
const USER: User = {
  id: '7f3c2a8e-1b4d-4c6e-9a0f-2d5b8c1e7a90',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  passwordHash: 'stored-hash',
  createdAt: new Date('2026-10-15T12:00:00Z'),
};

type Request = { headers: Record<string, string>; user?: User };

function buildJwtService(secret = SECRET): JwtService {
  const config = new ConfigService<Env, true>(
    validateEnv({
      DATABASE_URL: 'postgres://user:pass@localhost:5432/app',
      JWT_SECRET: secret,
    }),
  );
  return new JwtService(createJwtOptions(config));
}

function handler(): void {}
class Controller {}

function buildContext(request: Request): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => Controller,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function base64Url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

describe('JwtAuthGuard', () => {
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
  let users: jest.Mocked<Pick<UsersRepository, 'findById'>>;
  let jwt: JwtService;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) };
    users = { findById: jest.fn().mockResolvedValue(USER) };
    jwt = buildJwtService();
    guard = new JwtAuthGuard(
      reflector as unknown as Reflector,
      jwt,
      users as unknown as UsersRepository,
    );
  });

  async function tokenFor(sub = USER.id): Promise<string> {
    return jwt.signAsync({ sub });
  }

  function expectUnauthorized(request: Request): Promise<void> {
    return expect(guard.canActivate(buildContext(request))).rejects.toThrow(
      new UnauthorizedException('Missing or invalid access token.'),
    );
  }

  it('allows a public handler without an Authorization header', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = buildContext({ headers: {} });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    expect(users.findById).not.toHaveBeenCalled();
  });

  it('rejects a request without an Authorization header', async () => {
    await expectUnauthorized({ headers: {} });
  });

  it('rejects a non-Bearer scheme', async () => {
    await expectUnauthorized({ headers: { authorization: 'Basic x' } });
  });

  it('rejects Bearer without a token', async () => {
    await expectUnauthorized({ headers: { authorization: 'Bearer' } });
    await expectUnauthorized({ headers: { authorization: 'Bearer ' } });
  });

  it('rejects a token signed with another secret', async () => {
    const forged = await buildJwtService('b'.repeat(32)).signAsync({
      sub: USER.id,
    });

    await expectUnauthorized({
      headers: { authorization: `Bearer ${forged}` },
    });
  });

  it('rejects an expired token', async () => {
    const expired = await jwt.signAsync(
      { sub: USER.id },
      { expiresIn: '-1s' as never },
    );

    await expectUnauthorized({
      headers: { authorization: `Bearer ${expired}` },
    });
  });

  it('rejects an unsigned token with alg none', async () => {
    const unsigned = `${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url({
      sub: USER.id,
      iat: Math.floor(Date.now() / 1000),
    })}.`;

    await expectUnauthorized({
      headers: { authorization: `Bearer ${unsigned}` },
    });
  });

  it('rejects a valid token whose user no longer exists', async () => {
    users.findById.mockResolvedValue(null);
    const token = await tokenFor();

    await expectUnauthorized({ headers: { authorization: `Bearer ${token}` } });
    expect(users.findById).toHaveBeenCalledWith(USER.id);
  });

  it('rejects a valid token without a string sub', async () => {
    const token = await jwt.signAsync({ name: 'no subject' });

    await expectUnauthorized({ headers: { authorization: `Bearer ${token}` } });
    expect(users.findById).not.toHaveBeenCalled();
  });

  it('allows a valid token and attaches the user to the request', async () => {
    const token = await tokenFor();
    const request: Request = { headers: { authorization: `Bearer ${token}` } };

    await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);
    expect(request.user).toBe(USER);
  });

  it('accepts the Bearer scheme in any letter case', async () => {
    const token = await tokenFor();
    const request: Request = { headers: { authorization: `bearer ${token}` } };

    await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);
    expect(request.user).toBe(USER);
  });
});
