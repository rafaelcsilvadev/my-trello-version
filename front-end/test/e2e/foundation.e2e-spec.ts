import { expect, test } from '@playwright/test';

const APP_ORIGIN = 'http://localhost:5173';
const API_HEALTH_URL = 'http://localhost:3000/api/v1/health';

test('a protected route without a token redirects to login with the path', async ({
  page,
}) => {
  await page.goto('/boards');

  await expect(page).toHaveURL('/login?redirect=%2Fboards');
});

test('login with a stored token redirects to boards', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('my-trello.token', 'e2e-token');
  });
  // The token is fake: the real API would answer 401 and end the session on /boards.
  await page.route('**/api/v1/boards*', (route) => route.fulfill({ json: [] }));

  await page.goto('/login');

  await expect(page).toHaveURL('/boards');
});

test('an unknown path shows the not-found view', async ({ page }) => {
  await page.goto('/nope');

  await expect(
    page.getByRole('heading', { name: 'Page not found' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Go to My boards' }),
  ).toHaveAttribute('href', '/boards');
});

test('theme and language come from storage', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('my-trello.theme', 'dark');
    window.localStorage.setItem('my-trello.language', 'pt-BR');
  });

  await page.goto('/nope');

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  // Native controls such as scrollbars follow color-scheme, not our tokens.
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
});

test('the API allows the app origin through CORS', async ({ request }) => {
  const response = await request.get(API_HEALTH_URL, {
    headers: { Origin: APP_ORIGIN },
  });

  expect(response.status()).toBe(200);
  expect(response.headers()['access-control-allow-origin']).toBe(APP_ORIGIN);
});

test('the tab shows the logo favicon', async ({ page, request }) => {
  await page.goto('/login');

  await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
    'href',
    '/favicon.svg',
  );
  const response = await request.get('/favicon.svg');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('image/svg+xml');
  // A malformed SVG is still served with 200; only decoding it proves it renders.
  const width = await page.evaluate(async () => {
    const img = new Image();
    img.src = '/favicon.svg';
    await img.decode();
    return img.naturalWidth;
  });
  expect(width).toBeGreaterThan(0);
});
