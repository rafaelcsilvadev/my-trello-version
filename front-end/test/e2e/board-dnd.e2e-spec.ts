import { expect, type Locator, type Page, test } from '@playwright/test';

const PASSWORD = 'e2e-password';
const PHONE_VIEWPORT = { width: 375, height: 812 };

// One sign-up for the whole file: the auth routes allow 10 requests a minute.
async function signUp(page: Page) {
  await page.goto('/signup');
  await page.getByLabel('Name').fill('E2E Moves');
  await page.getByLabel('Email').fill(`e2e-dnd-${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL('/boards');
  return page.evaluate(() => ({ ...localStorage }));
}

// Opens a new board with these columns and cards, in order.
async function openBoard(page: Page, columns: Record<string, string[]>) {
  await page.goto('/boards');
  await page.getByRole('button', { name: 'Create board' }).first().click();
  const createDialog = page.getByRole('dialog', { name: 'New board' });
  await createDialog.getByLabel('Name').fill('Release plan');
  await createDialog.getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/\/b\/[^/]+$/);

  for (const [name, cards] of Object.entries(columns)) {
    const addColumn = page.getByRole('button', { name: 'Add column' });
    if (await addColumn.isVisible()) await addColumn.click();
    await page.getByLabel('Column name').fill(name);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    const column = page.getByRole('region', { name });
    await expect(column).toBeVisible();
    for (const title of cards) {
      if (!(await column.getByLabel('Task title').isVisible())) {
        await column.getByRole('button', { name: 'Add task' }).click();
      }
      await column.getByLabel('Task title').fill(title);
      await page.keyboard.press('Enter');
      await expect(column.getByRole('button', { name: title })).toBeVisible();
    }
    await page.keyboard.press('Escape');
  }
}

function column(page: Page, name: string) {
  return page.getByRole('region', { name });
}

function columnHandle(page: Page, name: string) {
  return page.getByRole('button', { name: `Column ${name}. Space to move` });
}

function cardTitles(column: Locator) {
  return column
    .locator('[data-card-id]')
    .evaluateAll((tiles) =>
      tiles.map((tile) => tile.getAttribute('aria-label')),
    );
}

function columnNames(page: Page) {
  return page
    .getByTestId('board-columns')
    .locator('[data-column-id]')
    .evaluateAll((handles) =>
      handles.map((handle) => handle.closest('section')?.ariaLabel),
    );
}

// The move request the screen sends for a card or a column.
function moveSaved(page: Page) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname.endsWith('/move'),
  );
}

test.describe('board drag and drop', () => {
  let session: Record<string, string> = {};

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    session = await signUp(page);
    await page.close();
  });

  // Every page of a test starts signed in as the file's user.
  test.beforeEach(async ({ context }) => {
    await context.addInitScript((entries) => {
      for (const [key, value] of Object.entries(entries)) {
        localStorage.setItem(key, value);
      }
    }, session);
  });

  // FDND-01 and FDND-03
  test('moves a card across columns with the mouse', async ({ page }) => {
    await openBoard(page, {
      'To do': ['Write notes', 'Tag release'],
      Doing: ['Run tests'],
    });

    const saved = moveSaved(page);
    const doing = column(page, 'Doing');
    const box = (await doing.boundingBox())!;
    // Below the last tile, so the card lands at the end of Doing.
    await column(page, 'To do')
      .getByRole('button', { name: 'Write notes' })
      .dragTo(doing, {
        targetPosition: { x: box.width / 2, y: box.height - 8 },
      });
    expect((await saved).ok()).toBe(true);

    await page.reload();
    await expect
      .poll(() => cardTitles(column(page, 'Doing')))
      .toEqual(['Run tests', 'Write notes']);
    await expect
      .poll(() => cardTitles(column(page, 'To do')))
      .toEqual(['Tag release']);
  });

  // FDND-13
  test('moves a card with the keyboard', async ({ page }) => {
    await openBoard(page, {
      'To do': ['Write notes'],
      Doing: ['Run tests'],
    });

    const saved = moveSaved(page);
    await column(page, 'To do')
      .getByRole('button', { name: 'Write notes' })
      .focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Space');
    expect((await saved).ok()).toBe(true);

    await page.reload();
    await expect
      .poll(() => cardTitles(column(page, 'Doing')))
      .toEqual(['Run tests', 'Write notes']);
    await expect.poll(() => cardTitles(column(page, 'To do'))).toEqual([]);
  });

  // FDND-20 and FDND-24
  test('moves a column with the mouse and with the keyboard', async ({
    page,
  }) => {
    await openBoard(page, { 'To do': [], Doing: [], Done: [] });

    let saved = moveSaved(page);
    const done = column(page, 'Done');
    const box = (await done.boundingBox())!;
    // Right of the middle of Done, so To do lands last.
    await columnHandle(page, 'To do').dragTo(done, {
      targetPosition: { x: box.width - 8, y: 16 },
    });
    expect((await saved).ok()).toBe(true);
    await page.reload();
    await expect
      .poll(() => columnNames(page))
      .toEqual(['Doing', 'Done', 'To do']);

    saved = moveSaved(page);
    await columnHandle(page, 'To do').focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Space');
    expect((await saved).ok()).toBe(true);
    await page.reload();
    await expect
      .poll(() => columnNames(page))
      .toEqual(['To do', 'Doing', 'Done']);
  });

  // FDND-31
  test('moves a card with Move to… on a phone', async ({ page }) => {
    await openBoard(page, {
      'To do': ['Write notes'],
      Doing: ['Run tests'],
    });
    await page.setViewportSize(PHONE_VIEWPORT);

    await column(page, 'To do')
      .getByRole('button', { name: 'Move to…' })
      .click();
    await page.getByRole('menuitem', { name: 'Move to…' }).click();
    await page
      .getByRole('dialog', { name: 'Move to…' })
      .getByRole('button', { name: 'Doing' })
      .click();
    await expect(page.getByText('Task moved to Doing')).toBeVisible();

    await page.reload();
    await expect
      .poll(() => cardTitles(column(page, 'Doing')))
      .toEqual(['Run tests', 'Write notes']);
    await expect.poll(() => cardTitles(column(page, 'To do'))).toEqual([]);
  });
});
