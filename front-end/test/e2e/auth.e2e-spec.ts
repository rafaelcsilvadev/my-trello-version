import { expect, test } from '@playwright/test';

// Auth routes allow 10 requests/min per IP: keep this journey to a few calls.
const MAX_AUTH_CALLS = 3;
const PASSWORD = 'e2e-password';

test('sign up, sign out and log in back to the requested page', async ({
  page,
}) => {
  const authCalls: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/v1/auth/')) {
      authCalls.push(request.url());
    }
  });
  const email = `e2e-${Date.now()}@example.com`;

  await page.goto('/signup');
  await page.getByLabel('Name').fill('E2E User');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL('/boards');
  await expect(page.getByText('Account created')).toBeVisible();

  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page).toHaveURL('/settings');
  await page.getByRole('button', { name: 'Sign out' }).click();

  await expect(page).toHaveURL('/login');
  expect(
    await page.evaluate(() => window.localStorage.getItem('my-trello.token')),
  ).toBeNull();

  await page.goto('/settings');
  await expect(page).toHaveURL('/login?redirect=%2Fsettings');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL('/settings');
  await expect(
    page.getByText(`Signed in as E2E User · ${email}`),
  ).toBeVisible();
  expect(authCalls.length).toBeLessThanOrEqual(MAX_AUTH_CALLS);
});
