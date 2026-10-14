import { startPostgres } from '../../support/start-postgres';

describe('startPostgres', () => {
  it('rethrows a Docker-required error when the container cannot start', async () => {
    const failingStarter = () =>
      Promise.reject(new Error('Could not find a working container runtime'));

    await expect(startPostgres(failingStarter)).rejects.toThrow(
      'Docker is required to run integration and e2e tests (Testcontainers could not reach a Docker daemon).',
    );
  });
});
