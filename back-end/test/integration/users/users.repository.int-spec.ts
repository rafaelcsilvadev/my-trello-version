import type { TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { EmailAlreadyRegisteredError } from '../../../src/auth/auth.errors';
import { UsersModule } from '../../../src/users/users.module';
import { UsersRepository } from '../../../src/users/users.repository';
import { bootWithDatabase } from '../../support/boot-with-database';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('UsersRepository', () => {
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let usersRepository: UsersRepository;

  const ana = { name: 'Ana', email: 'ana@example.com', passwordHash: 'hash' };

  beforeAll(async () => {
    moduleRef = await bootWithDatabase([UsersModule]);
    dataSource = moduleRef.get(DataSource);
    usersRepository = moduleRef.get(UsersRepository);
  });

  afterEach(async () => {
    await dataSource.query('DELETE FROM "users"');
  });

  // Leave the shared database without this migration, as other suites
  // assert the exact migration history.
  afterAll(async () => {
    await dataSource.undoLastMigration();
    await moduleRef.close();
  });

  describe('create', () => {
    it('returns the stored user with a generated id and createdAt', async () => {
      const user = await usersRepository.create(ana);

      expect(user).toMatchObject(ana);
      expect(user.id).toMatch(UUID);
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('rejects a duplicate email with EmailAlreadyRegisteredError', async () => {
      await usersRepository.create(ana);

      await expect(
        usersRepository.create({ ...ana, name: 'Other' }),
      ).rejects.toBeInstanceOf(EmailAlreadyRegisteredError);
    });

    it('lets exactly one of two concurrent creates with the same email win', async () => {
      const results = await Promise.allSettled([
        usersRepository.create(ana),
        usersRepository.create({ ...ana, name: 'Other' }),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter(
        (r): r is PromiseRejectedResult => r.status === 'rejected',
      );
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toBeInstanceOf(EmailAlreadyRegisteredError);
    });

    it('propagates database errors other than the email conflict', async () => {
      const error = await usersRepository
        .create({ ...ana, name: 'x'.repeat(101) })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(Error);
      expect(error).not.toBeInstanceOf(EmailAlreadyRegisteredError);
    });
  });

  describe('findByEmail', () => {
    it('returns the user with that email', async () => {
      const created = await usersRepository.create(ana);

      expect(await usersRepository.findByEmail(ana.email)).toEqual(created);
    });

    it('returns null for an unknown email', async () => {
      expect(
        await usersRepository.findByEmail('nobody@example.com'),
      ).toBeNull();
    });
  });

  describe('findById', () => {
    it('returns the user with that id', async () => {
      const created = await usersRepository.create(ana);

      expect(await usersRepository.findById(created.id)).toEqual(created);
    });

    it('returns null for an unknown id', async () => {
      expect(
        await usersRepository.findById('00000000-0000-4000-8000-000000000000'),
      ).toBeNull();
    });
  });
});
