import type { ModuleMetadata } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { validateEnv } from '../../src/config/env.schema';
import { DatabaseModule } from '../../src/database/database.module';

// Boots the given modules on the real DatabaseModule (real migrations) against
// the Testcontainers PostgreSQL started by the global setup.
export async function bootWithDatabase(
  imports: ModuleMetadata['imports'] = [],
): Promise<TestingModule> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        validate: () => validateEnv(process.env),
      }),
      DatabaseModule,
      ...imports,
    ],
  }).compile();
  return moduleRef.init();
}
