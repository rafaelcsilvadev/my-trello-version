import { expect, test } from '@playwright/test';

// Auth routes allow 10 requests/min per route and the suite already uses all
// 10 sign-ups, so these tests never sign up: they cover the paths that fail.
const TOKEN_KEY = 'my-trello.token';

test('sign up shows every field error and sends nothing', async ({ page }) => {
  const authCalls: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/v1/auth/')) {
      authCalls.push(request.url());
    }
  });

  await page.goto('/signup');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByText('Enter your name')).toBeVisible();
  await expect(page.getByText('Enter a valid email')).toBeVisible();
  await expect(page.getByText('Use 8 to 72 characters').last()).toBeVisible();

  await page.getByLabel('Name').fill('E2E Errors');
  await page.getByLabel('Email').fill('errors@example.com');
  await page.getByLabel('Password', { exact: true }).fill('long-enough-1');
  await page.getByLabel('Confirm password').fill('different-1');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByText("Passwords don't match")).toBeVisible();
  await expect(page).toHaveURL('/signup');
  expect(authCalls).toHaveLength(0);
});

test('log in with unknown credentials shows the alert and stays on the page', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(`nobody-${Date.now()}@example.com`);
  await page.getByLabel('Password').fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByText('Invalid email or password')).toBeVisible();
  await expect(page).toHaveURL('/login');
  expect(
    await page.evaluate((key) => localStorage.getItem(key), TOKEN_KEY),
  ).toBeNull();
});

test('an expired token sends the user to log in with a notice and the path back', async ({
  page,
}) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, 'not-a-valid-token');
  }, TOKEN_KEY);

  await page.goto('/boards');

  await expect(page).toHaveURL(
    '/login?redirect=%2Fboards&reason=session-expired',
  );
  await expect(
    page.getByText('Your session expired. Log in again.'),
  ).toBeVisible();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), TOKEN_KEY),
  ).toBeNull();
});
