import { expect, test } from '@playwright/test';

const PASSWORD = 'e2e-password';
const PHONE_VIEWPORT = { width: 375, height: 812 };

test('manage columns, cards and archived items on a board', async ({
  page,
}) => {
  await page.goto('/signup');
  await page.getByLabel('Name').fill('E2E Board');
  await page.getByLabel('Email').fill(`e2e-board-${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL('/boards');

  await page.getByRole('button', { name: 'Create board' }).first().click();
  const createDialog = page.getByRole('dialog', { name: 'New board' });
  await createDialog.getByLabel('Name').fill('Vacation trip');
  await createDialog.getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/\/b\/[^/]+$/);

  // FBV-14: the empty board opens the column field.
  await expect(page.getByText('Add the first column')).toBeVisible();
  await page.getByLabel('Column name').fill('To do');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Column created')).toBeVisible();
  await page.keyboard.press('Escape');
  const toDo = page.getByRole('region', { name: 'To do' });
  await expect(toDo).toBeVisible();

  // FBV-25: two cards land at the end of the column.
  await toDo.getByRole('button', { name: 'Add task' }).click();
  await toDo.getByLabel('Task title').fill('Buy tickets');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Task created')).toBeVisible();
  await expect(toDo.getByText('Buy tickets')).toBeVisible();
  await toDo.getByLabel('Task title').fill('Book hotel');
  await page.keyboard.press('Enter');
  await expect(toDo.getByText('Book hotel')).toBeVisible();

  // FBV-31: the done state survives a reload.
  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      new URL(response.url()).pathname.startsWith('/api/v1/cards/'),
  );
  // React Aria hides the native input under the styled box: click its label.
  await toDo
    .locator('label', {
      has: page.getByRole('checkbox', { name: 'Completed' }),
    })
    .first()
    .click();
  expect((await saved).ok()).toBe(true);
  await page.reload();
  const doneBoxes = page
    .getByRole('region', { name: 'To do' })
    .getByRole('checkbox', { name: 'Completed' });
  await expect(doneBoxes.first()).toBeChecked();
  await expect(doneBoxes.last()).not.toBeChecked();

  // FBV-19
  await page.getByRole('button', { name: 'To do', exact: true }).click();
  await page
    .getByRole('region', { name: 'To do' })
    .getByLabel('Column name')
    .fill('Planning');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Column renamed')).toBeVisible();
  const planning = page.getByRole('region', { name: 'Planning' });
  await expect(planning).toBeVisible();

  // FBV-22
  await planning.getByRole('button', { name: 'Column actions' }).click();
  await page.getByRole('menuitem', { name: 'Archive' }).click();
  await expect(page.getByText('Column archived')).toBeVisible();
  await expect(planning).toBeHidden();

  // FBV-33 and FBV-39: the restored column comes back with its cards.
  const showArchived = page.getByRole('switch', { name: 'Show archived' });
  await expect(showArchived).not.toBeChecked();
  await page.getByText('Show archived').click();
  const archivedColumns = page.getByRole('region', {
    name: 'Archived columns',
  });
  await archivedColumns
    .getByRole('listitem', { name: 'Planning' })
    .getByRole('button', { name: 'Restore' })
    .click();
  await expect(page.getByText('Column restored')).toBeVisible();
  await expect(planning.getByText('Buy tickets')).toBeVisible();
  await expect(planning.getByText('Book hotel')).toBeVisible();

  // FBV-41: archive an empty column, then delete it.
  await page.getByRole('button', { name: 'Add column' }).click();
  await page.getByLabel('Column name').fill('Ideas');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  const ideas = page.getByRole('region', { name: 'Ideas' });
  await ideas.getByRole('button', { name: 'Column actions' }).click();
  await page.getByRole('menuitem', { name: 'Archive' }).click();
  await archivedColumns
    .getByRole('listitem', { name: 'Ideas' })
    .getByRole('button', { name: 'Delete permanently' })
    .click();
  await page
    .getByRole('alertdialog', { name: 'Delete the column Ideas permanently?' })
    .getByRole('button', { name: 'Delete permanently' })
    .click();
  await expect(page.getByText('Column permanently deleted')).toBeVisible();
  await expect(
    archivedColumns.getByRole('listitem', { name: 'Ideas' }),
  ).toBeHidden();

  // FBV-48 and FBV-49: one column per screen with its position.
  await page.getByRole('button', { name: 'Add column' }).click();
  await page.getByLabel('Column name').fill('Done');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  const done = page.getByRole('region', { name: 'Done' });
  await expect(done).toBeVisible();
  // A third column puts its card's checkbox well past the phone screen.
  await page.getByRole('button', { name: 'Add column' }).click();
  await page.getByLabel('Column name').fill('Later');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  const later = page.getByRole('region', { name: 'Later' });
  await later.getByRole('button', { name: 'Add task' }).click();
  await later.getByLabel('Task title').fill('Pack bags');
  await page.keyboard.press('Enter');
  await expect(later.getByText('Pack bags')).toBeVisible();
  await page.keyboard.press('Escape');
  // Adding the task scrolled the board to Later; reload to start at Planning.
  await page.reload();
  await page.setViewportSize(PHONE_VIEWPORT);
  await expect(page.getByText('Planning · 1 of 3')).toBeVisible();
  await expect(planning).toBeInViewport({ ratio: 1 });
  await expect(done).not.toBeInViewport({ ratio: 0.5 });
  // The off-screen columns' checkboxes must not widen the page.
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});
