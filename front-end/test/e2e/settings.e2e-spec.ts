import { expect, type Page, test } from '@playwright/test';

// The token is fake, so the API is stubbed: the real one would answer 401 and end the session.
async function signInStubbed(page: Page) {
  await page.addInitScript(() => {
    const { localStorage } = window;
    localStorage.setItem('my-trello.token', 'e2e-token');
    // Seed once: a reload must keep what the test picked, not reset it.
    if (!localStorage.getItem('my-trello.language')) {
      localStorage.setItem('my-trello.language', 'pt-BR');
      localStorage.setItem('my-trello.theme', 'light');
    }
  });
  await page.route('**/api/v1/**', (route) =>
    route.fulfill({
      json: { id: 'u1', name: 'E2E Settings', email: 'e2e@example.com' },
    }),
  );
  await page.route('**/api/v1/boards*', (route) => route.fulfill({ json: [] }));
}

test('language and theme apply at once and survive a reload', async ({
  page,
}) => {
  await signInStubbed(page);
  await page.goto('/settings');
  await expect(
    page.getByRole('heading', { name: 'Configurações', level: 1 }),
  ).toBeVisible();

  await page.getByRole('tab', { name: 'English' }).click();
  await expect(
    page.getByRole('heading', { name: 'Settings', level: 1 }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.reload();

  await expect(
    page.getByRole('heading', { name: 'Settings', level: 1 }),
  ).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('tab', { name: 'English' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('tab', { name: 'Dark' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('the ? key opens the shortcuts dialog and Esc closes it', async ({
  page,
}) => {
  await signInStubbed(page);
  await page.addInitScript(() => {
    window.localStorage.setItem('my-trello.language', 'en');
  });
  await page.goto('/boards');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.keyboard.press('?');

  const dialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(dialog).toBeVisible();

  await page.keyboard.press('Escape');

  await expect(dialog).toHaveCount(0);
});

test('a phone has no shortcuts icon and no shortcuts panel', async ({
  page,
}) => {
  await signInStubbed(page);
  await page.addInitScript(() => {
    window.localStorage.setItem('my-trello.language', 'en');
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/settings');
  await expect(
    page.getByRole('heading', { name: 'Settings', level: 1 }),
  ).toBeVisible();

  await expect(
    page.getByRole('button', { name: 'Keyboard shortcuts' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Keyboard shortcuts' }),
  ).toHaveCount(0);

  await page.keyboard.press('?');

  await expect(page.getByRole('dialog')).toHaveCount(0);
});
