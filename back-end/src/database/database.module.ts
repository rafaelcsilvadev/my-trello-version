import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { MixedList } from 'typeorm';
import type { Env } from '../config/env.schema';

export const MIGRATIONS = Symbol('MIGRATIONS');

// .d.ts files next to the compiled migrations are skipped by TypeORM.
export const MIGRATIONS_GLOB = join(__dirname, 'migrations', '*.{js,ts}');

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      extraProviders: [{ provide: MIGRATIONS, useValue: [MIGRATIONS_GLOB] }],
      inject: [ConfigService, MIGRATIONS],
      useFactory: (
        config: ConfigService<Env, true>,
        migrations: MixedList<string | Function>,
      ) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL', { infer: true }),
        synchronize: false,
        migrations,
        migrationsRun: true,
        autoLoadEntities: true,
        // Fail fast like an invalid env: compose only starts the API once
        // PostgreSQL is healthy, so a connection error is not transient.
        retryAttempts: 0,
      }),
    }),
  ],
})
export class DatabaseModule {}
