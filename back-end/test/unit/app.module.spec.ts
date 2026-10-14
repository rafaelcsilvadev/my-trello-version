import type * as Testing from '@nestjs/testing';
import type { ConfigService } from '@nestjs/config';
import type { Type } from '@nestjs/common';

type LoadedApp = {
  AppModule: Type;
  ConfigService: Type<ConfigService>;
  Test: typeof Testing.Test;
};

// Fresh module registry per call: ConfigModule.forRoot reads process.env when
// app.module is loaded, so each test must load it after setting its env.
// Test comes from the same registry so Nest core tokens match AppModule's.
function loadApp(): LoadedApp {
  let loaded: LoadedApp | undefined;
  jest.isolateModules(() => {
    loaded = {
      AppModule: (require('../../src/app.module') as LoadedApp).AppModule,
      ConfigService: (require('@nestjs/config') as LoadedApp).ConfigService,
      Test: (require('@nestjs/testing') as typeof Testing).Test,
    };
  });
  return loaded!;
}

describe('AppModule', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('exposes the validated env through ConfigService', async () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/app';
    delete process.env.PORT;
    const app = loadApp();

    const moduleRef = await app.Test.createTestingModule({
      imports: [app.AppModule],
    }).compile();

    const config = moduleRef.get(app.ConfigService);
    expect(config.get('PORT')).toBe(3000);
    expect(config.get('DATABASE_URL')).toBe(
      'postgres://user:pass@localhost:5432/app',
    );
  });

  it('fails to compile when DATABASE_URL is missing', async () => {
    delete process.env.DATABASE_URL;

    const app = loadApp();

    await expect(
      app.Test.createTestingModule({ imports: [app.AppModule] }).compile(),
    ).rejects.toThrow(/DATABASE_URL/);
  });
});
