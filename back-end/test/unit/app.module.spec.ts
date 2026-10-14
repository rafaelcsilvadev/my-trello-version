import type * as Testing from '@nestjs/testing';
import type { ConfigService } from '@nestjs/config';
import { Module, type Type } from '@nestjs/common';
import type * as TypeOrm from 'typeorm';

type LoadedApp = {
  AppModule: Type;
  DatabaseModule: Type;
  ConfigService: Type<ConfigService>;
  DataSource: typeof TypeOrm.DataSource;
  Test: typeof Testing.Test;
};

// Fresh module registry per call: ConfigModule.forRoot reads process.env when
// app.module is loaded, so each test must load it after setting its env.
// Test and DataSource come from the same registry so their tokens match
// AppModule's.
// DatabaseModule is swapped out so unit tests never open a connection.
function loadApp(): LoadedApp {
  let loaded: LoadedApp | undefined;
  jest.isolateModules(() => {
    loaded = {
      AppModule: (require('../../src/app.module') as LoadedApp).AppModule,
      DatabaseModule: (
        require('../../src/database/database.module') as LoadedApp
      ).DatabaseModule,
      ConfigService: (require('@nestjs/config') as LoadedApp).ConfigService,
      DataSource: (require('typeorm') as typeof TypeOrm).DataSource,
      Test: (require('@nestjs/testing') as typeof Testing).Test,
    };
  });
  return loaded!;
}

@Module({})
class NoDatabaseModule {}

// Stand-in DataSource so modules that inject it (health) still compile.
function compileWithoutDatabase(app: LoadedApp) {
  return app.Test.createTestingModule({ imports: [app.AppModule] })
    .overrideModule(app.DatabaseModule)
    .useModule({
      module: NoDatabaseModule,
      global: true,
      providers: [{ provide: app.DataSource, useValue: {} }],
      exports: [app.DataSource],
    })
    .compile();
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

    const moduleRef = await compileWithoutDatabase(app);

    const config = moduleRef.get(app.ConfigService);
    expect(config.get('PORT')).toBe(3000);
    expect(config.get('DATABASE_URL')).toBe(
      'postgres://user:pass@localhost:5432/app',
    );
  });

  it('fails to compile when DATABASE_URL is missing', async () => {
    delete process.env.DATABASE_URL;

    const app = loadApp();

    await expect(compileWithoutDatabase(app)).rejects.toThrow(/DATABASE_URL/);
  });
});
