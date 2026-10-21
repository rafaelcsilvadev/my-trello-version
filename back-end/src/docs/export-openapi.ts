import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { API_PREFIX, createOpenApiDocument } from '../app.setup';

// Writes the OpenAPI document to the file given as the first argument.
// Usage: pnpm run openapi:export <file>
async function exportOpenApi(outFile: string): Promise<void> {
  // ConfigModule validates the environment when app.module is loaded, so the
  // placeholders go in first; preview mode never uses them.
  process.env.DATABASE_URL ??= 'postgres://unused@localhost/unused';
  process.env.JWT_SECRET ??= 'unused-placeholder-for-openapi-export';
  const { AppModule } =
    require('../app.module') as typeof import('../app.module');
  // Preview mode registers modules and controllers without instantiating
  // providers, so nothing connects to the database or reads secrets.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    preview: true,
    logger: false,
    // Rethrow instead of a silent process.exit(1), so the error is printed.
    abortOnError: false,
  });
  app.setGlobalPrefix(API_PREFIX);
  const document = createOpenApiDocument(app);
  await app.close();

  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(outFile, `${JSON.stringify(document, null, 2)}\n`);
}

const outFile = process.argv[2];
if (!outFile) {
  console.error('Usage: pnpm run openapi:export <file>');
  process.exit(1);
}
exportOpenApi(resolve(outFile)).catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
