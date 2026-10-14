import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';

export const POSTGRES_IMAGE = 'postgres:18.6-alpine';

const DOCKER_REQUIRED_MESSAGE =
  'Docker is required to run integration and e2e tests (Testcontainers could not reach a Docker daemon).';

type ContainerStarter = () => Promise<StartedPostgreSqlContainer>;

const startContainer: ContainerStarter = () =>
  new PostgreSqlContainer(POSTGRES_IMAGE).start();

export async function startPostgres(
  start: ContainerStarter = startContainer,
): Promise<StartedPostgreSqlContainer> {
  try {
    return await start();
  } catch (error) {
    throw new Error(DOCKER_REQUIRED_MESSAGE, { cause: error });
  }
}
