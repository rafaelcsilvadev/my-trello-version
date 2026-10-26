import { expect, test } from '@playwright/test';

// Auth routes allow 10 requests/min per IP: only the sign-up hits them.
const MAX_AUTH_CALLS = 1;
const PASSWORD = 'e2e-password';

test('create, edit, archive, restore and delete a board', async ({ page }) => {
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
