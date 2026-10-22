import { defineConfig, devices } from '@playwright/test';

const API_HEALTH_URL = 'http://localhost:3000/api/v1/health';

export default defineConfig({
  testDir: 'test/e2e',
  testMatch: '**/*.e2e-spec.ts',
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // Compose is left running after the suite; `docker compose down` stops it.
      command: 'docker compose up --wait postgres api',
      cwd: '..',
      url: API_HEALTH_URL,
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: 'vite build && vite preview --port 5173 --strictPort',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
