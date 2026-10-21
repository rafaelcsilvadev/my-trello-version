import type { INestApplication } from '@nestjs/common';
import type { OpenAPIObject } from '@nestjs/swagger';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import request from 'supertest';
import { createTestApp } from '../../support/create-test-app';

const exec = promisify(execFile);

// The test app adds TestOnlyController, which the real app never serves.
function withoutTestOnlyRoutes(document: OpenAPIObject): OpenAPIObject {
  const paths = Object.fromEntries(
    Object.entries(document.paths).filter(
      ([path]) => !path.startsWith('/api/v1/test-only'),
    ),
  );
  const schemas = Object.fromEntries(
    Object.entries(document.components?.schemas ?? {}).filter(
      ([name]) => !name.startsWith('TestOnly'),
    ),
  );
  return {
    ...document,
    paths,
    components: { ...document.components, schemas },
  };
}

describe('OpenAPI export (e2e)', () => {
  let app: INestApplication;
  let outDir: string;

  beforeAll(async () => {
    app = await createTestApp();
    outDir = await mkdtemp(join(tmpdir(), 'openapi-export-'));
  });

  afterAll(async () => {
    await app.close();
    await rm(outDir, { recursive: true, force: true });
  });

  it('writes the document served at GET /api/docs-json without database or secrets', async () => {
    const outFile = join(outDir, 'nested', 'openapi.json');
    const { DATABASE_URL: _url, JWT_SECRET: _secret, ...env } = process.env;

    await exec('pnpm', ['run', '--silent', 'openapi:export', outFile], {
      env,
      timeout: 60_000,
    });

    const written = await readFile(outFile, 'utf8');
    const served = await request(app.getHttpServer()).get('/api/docs-json');
    expect(JSON.parse(written)).toEqual(withoutTestOnlyRoutes(served.body));
    // Stable formatting, so a regenerated file only differs when the API does.
    expect(written).toBe(`${JSON.stringify(JSON.parse(written), null, 2)}\n`);
  }, 90_000);
});
