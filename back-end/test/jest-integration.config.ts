import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '..',
  testRegex: 'test/integration/.*\\.int-spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  globalSetup: '<rootDir>/test/support/postgres.global-setup.ts',
  globalTeardown: '<rootDir>/test/support/postgres.global-teardown.ts',
  testEnvironment: 'node',
};

export default config;
