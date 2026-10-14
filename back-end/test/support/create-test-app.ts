import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import type { DestinationStream } from 'pino';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { LOG_DESTINATION } from '../../src/logging/logging.module';
import { TestOnlyController } from './test-only.controller';

// Boots the real AppModule with the same HTTP wiring as main.ts.
// logDestination captures the JSON log lines instead of writing to stdout.
// dataSource replaces the TypeORM DataSource seen by the app's providers.
export async function createTestApp(
  options: { logDestination?: DestinationStream; dataSource?: unknown } = {},
): Promise<NestExpressApplication> {
  const builder = Test.createTestingModule({
    imports: [AppModule],
    controllers: [TestOnlyController],
  });
  if (options.logDestination) {
    builder.overrideProvider(LOG_DESTINATION).useValue(options.logDestination);
  }
  if (options.dataSource) {
    builder.overrideProvider(DataSource).useValue(options.dataSource);
  }
  const moduleRef = await builder.compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();
  return app;
}
