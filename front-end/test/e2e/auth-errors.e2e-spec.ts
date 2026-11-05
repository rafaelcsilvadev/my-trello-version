import { expect, test } from '@playwright/test';

// The Playwright run raises AUTH_RATE_LIMIT, so a test may register through the
// API to set up an account (the default of 10 a minute would not allow it).
const API_URL = 'http://localhost:3000/api/v1';
const PASSWORD = 'e2e-password';
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

test('sign up with a registered email shows the error and keeps the form', async ({
  page,
  request,
}) => {
  const email = `e2e-taken-${Date.now()}@example.com`;
  const registered = await request.post(`${API_URL}/auth/register`, {
    data: { name: 'Already Here', email, password: PASSWORD },
  });
  expect(registered.status()).toBe(201);

  await page.goto('/signup');
  await page.getByLabel('Name').fill('Someone Else');
  // The API normalizes the email, so a different case is still the same account.
  await page.getByLabel('Email').fill(email.toUpperCase());
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(
    page.getByText('This email is already registered'),
  ).toBeVisible();
  await expect(page).toHaveURL('/signup');
  await expect(page.getByLabel('Name')).toHaveValue('Someone Else');
  expect(
    await page.evaluate((key) => localStorage.getItem(key), TOKEN_KEY),
  ).toBeNull();
});
