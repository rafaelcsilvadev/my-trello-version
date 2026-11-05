import { type Page, expect, test } from '@playwright/test';

// Auth routes allow 10 requests/min per IP: only the sign-up hits them.
const MAX_AUTH_CALLS = 1;
const PASSWORD = 'e2e-password';

// One sign-up for the file: the journey leaves the account without boards, and
// the failure tests that follow reuse the same signed-in page.
test.describe.configure({ mode: 'serial' });

let page: Page;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
});

test.afterAll(async () => {
  await page.close();
});

test('create, edit, archive, restore and delete a board', async () => {
  const authCalls: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/v1/auth/')) {
      authCalls.push(request.url());
    }
  });

  await page.goto('/signup');
  await page.getByLabel('Name').fill('E2E Boards');
  await page.getByLabel('Email').fill(`e2e-boards-${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL('/boards');

  await page.getByRole('button', { name: 'Create board' }).first().click();
  const createDialog = page.getByRole('dialog', { name: 'New board' });
  await createDialog.getByLabel('Name').fill('Vacation trip');
  await createDialog
    .getByLabel('Description (optional)')
    .fill('Plan the summer');
  await createDialog.getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/\/b\/[^/]+$/);

  await page.getByRole('link', { name: 'My Trello Version' }).click();
  await expect(page).toHaveURL('/boards');
  await expect(page.getByRole('link', { name: /Vacation trip/ })).toBeVisible();

  await page.getByRole('button', { name: 'Board actions' }).click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  const editDialog = page.getByRole('dialog', { name: 'Edit board' });
  await editDialog.getByLabel('Name').fill('Summer trip');
  await editDialog.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Board saved')).toBeVisible();
  await expect(page.getByRole('link', { name: /Summer trip/ })).toBeVisible();

  await page.getByRole('button', { name: 'Board actions' }).click();
  await page.getByRole('menuitem', { name: 'Archive' }).click();
  await expect(page.getByText('Board archived')).toBeVisible();
  await expect(page.getByText('Create your first board')).toBeVisible();

  await page.getByRole('tab', { name: 'Archived' }).click();
  await page.getByRole('button', { name: 'Board actions' }).click();
  await page.getByRole('menuitem', { name: 'Restore' }).click();
  await expect(page.getByText('Board restored')).toBeVisible();
  await expect(page.getByText('No archived boards')).toBeVisible();

  await page.getByRole('tab', { name: 'Active' }).click();
  await page.getByRole('button', { name: 'Board actions' }).click();
  await page.getByRole('menuitem', { name: 'Archive' }).click();
  await expect(page.getByText('Create your first board')).toBeVisible();

  await page.getByRole('tab', { name: 'Archived' }).click();
  await page.getByRole('button', { name: 'Board actions' }).click();
  await page.getByRole('menuitem', { name: 'Delete permanently' }).click();
  const deleteDialog = page.getByRole('alertdialog', {
    name: 'Delete the board Summer trip permanently?',
  });
  const confirm = deleteDialog.getByRole('button', {
    name: 'Delete permanently',
  });
  await expect(confirm).toBeDisabled();
  await deleteDialog
    .getByLabel('Type the board name to confirm')
    .fill('Summer trip');
  await confirm.click();

  await expect(page.getByText('Board permanently deleted')).toBeVisible();
  await expect(page.getByText('No archived boards')).toBeVisible();
  expect(authCalls).toHaveLength(MAX_AUTH_CALLS);
});

test('keeps the dialog and offers a retry when creating a board fails', async () => {
  await page.goto('/boards');
  await page.route('**/api/v1/boards', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({ status: 500, json: { title: 'Internal Server Error' } })
      : route.fallback(),
  );

  await page.getByRole('button', { name: 'Create board' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'New board' });
  await dialog.getByLabel('Name').fill('Retry me');
  await dialog.getByRole('button', { name: 'Create' }).click();

  await expect(page.getByText('Couldn’t save. Try again.')).toBeVisible();
  await expect(page).toHaveURL('/boards');

  await page.unroute('**/api/v1/boards');
  // The toast sits under the open dialog (z-50 vs z-100), so the retry is the Create button.
  await dialog.getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/\/b\/[^/]+$/);
});

test('rolls back only the board whose archive fails', async () => {
  await page.goto('/boards');
  await page.getByRole('button', { name: 'Create board' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'New board' });
  await dialog.getByLabel('Name').fill('Second board');
  await dialog.getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/\/b\/[^/]+$/);
  await page.goto('/boards');
  await expect(page.getByRole('link', { name: /Retry me/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Second board/ })).toBeVisible();

  const failingId = (
    await page.getByRole('link', { name: /Retry me/ }).getAttribute('href')
  )
    ?.split('/')
    .pop();
  await page.route(`**/api/v1/boards/${failingId}/archive`, (route) =>
    route.fulfill({ status: 500, json: { title: 'Internal Server Error' } }),
  );

  const card = (name: RegExp) =>
    page
      .locator('li, article, div')
      .filter({ has: page.getByRole('link', { name }) });
  await card(/Retry me/)
    .last()
    .getByRole('button', { name: 'Board actions' })
    .click();
  await page.getByRole('menuitem', { name: 'Archive' }).click();
  await expect(page.getByText('Couldn’t save. Try again.')).toBeVisible();
  await expect(page.getByRole('link', { name: /Retry me/ })).toBeVisible();

  await card(/Second board/)
    .last()
    .getByRole('button', { name: 'Board actions' })
    .click();
  await page.getByRole('menuitem', { name: 'Archive' }).click();
  await expect(page.getByText('Board archived')).toBeVisible();
  await expect(page.getByRole('link', { name: /Second board/ })).toBeHidden();
  await expect(page.getByRole('link', { name: /Retry me/ })).toBeVisible();
});

test('a 401 while saving sends the user to log in and back to the page', async () => {
  await page.goto('/boards');
  await page.route('**/api/v1/boards/*/archive', (route) =>
    route.fulfill({ status: 401, json: { title: 'Unauthorized' } }),
  );

  await page.getByRole('button', { name: 'Board actions' }).first().click();
  await page.getByRole('menuitem', { name: 'Archive' }).click();

  await expect(page).toHaveURL(
    '/login?redirect=%2Fboards&reason=session-expired',
  );
  await expect(
    page.getByText('Your session expired. Log in again.'),
  ).toBeVisible();
});
