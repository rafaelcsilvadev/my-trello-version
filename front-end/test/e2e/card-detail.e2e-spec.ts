import {
  type APIRequestContext,
  expect,
  type Page,
  test,
} from '@playwright/test';

const API_URL = 'http://localhost:3000/api/v1';
const PASSWORD = 'e2e-password';
const PHONE_VIEWPORT = { width: 375, height: 812 };
const SHORT_DESKTOP_VIEWPORT = { width: 1280, height: 500 };
const TOKEN_KEY = 'my-trello.token';

type SeededBoard = { boardId: string; cardIds: Record<string, string> };

// Local YYYY-MM-DD, `offset` days from today: the screen reads the same clock.
function day(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// One sign-up for the whole file: the auth routes allow 10 requests a minute.
async function signUp(page: Page) {
  await page.goto('/signup');
  await page.getByLabel('Name').fill('E2E Card Detail');
  await page
    .getByLabel('Email')
    .fill(`e2e-card-detail-${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL('/boards');
  return page.evaluate(() => ({ ...localStorage }));
}

function apiClient(request: APIRequestContext, token: string) {
  const headers = { Authorization: `Bearer ${token}` };
  return async function post(path: string, data?: object) {
    const response = await request.post(`${API_URL}${path}`, {
      headers,
      data,
    });
    expect(response.ok()).toBe(true);
    return (await response.json()) as { id: string };
  };
}

async function seedBoard(
  request: APIRequestContext,
  token: string,
  columns: Record<string, string[]>,
): Promise<SeededBoard> {
  const post = apiClient(request, token);
  const board = await post('/boards', { title: 'Card detail plan' });
  const cardIds: Record<string, string> = {};
  for (const [name, titles] of Object.entries(columns)) {
    const list = await post(`/boards/${board.id}/lists`, { title: name });
    for (const title of titles) {
      cardIds[title] = (await post(`/lists/${list.id}/cards`, { title })).id;
    }
  }
  return { boardId: board.id, cardIds };
}

const COLUMNS = {
  'To do': ['Write notes', 'Clean backlog', 'Tag release'],
  Doing: ['Run tests'],
};

function column(page: Page, name: string) {
  return page.getByRole('region', { name });
}

function tile(page: Page, title: string) {
  return page.getByRole('button', { name: title, exact: true });
}

function detail(page: Page, title: string) {
  return page.getByRole('dialog', { name: title, exact: true });
}

function tileTitles(page: Page, columnName: string) {
  return column(page, columnName)
    .locator('[data-card-id]')
    .evaluateAll((tiles) =>
      tiles.map((tile) => tile.getAttribute('aria-label')),
    );
}

test.describe('card detail', () => {
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

  async function openSeededBoard(page: Page, request: APIRequestContext) {
    const seeded = await seedBoard(request, session[TOKEN_KEY], COLUMNS);
    await page.goto(`/b/${seeded.boardId}`);
    await expect(column(page, 'Doing')).toBeVisible();
    return seeded;
  }

  // FCD-01, FCD-03, FCD-16, FCD-21, FCD-26 and FCD-52
  test('edits a card opened from its tile and the board shows the values', async ({
    page,
    request,
  }) => {
    const { boardId, cardIds } = await openSeededBoard(page, request);

    await tile(page, 'Write notes').click();
    await expect(page).toHaveURL(`/b/${boardId}/t/${cardIds['Write notes']}`);
    const panel = detail(page, 'Write notes');
    await expect(panel).toHaveAttribute('aria-modal', 'true');
    await expect(panel.getByRole('button', { name: 'Close' })).toBeVisible();
    await expect(column(page, 'Doing')).toBeAttached();

    const title = panel.getByRole('textbox', { name: 'Title' });
    await title.fill('  Write release notes  ');
    await title.press('Enter');
    const renamed = detail(page, 'Write release notes');
    await expect(renamed.getByRole('textbox', { name: 'Title' })).toHaveValue(
      'Write release notes',
    );

    // React Aria hides the native input under the styled box: click its label.
    await renamed
      .locator('label', {
        has: page.getByRole('checkbox', { name: 'Completed' }),
      })
      .click();
    await expect(
      renamed.getByRole('checkbox', { name: 'Completed' }),
    ).toBeChecked();

    const due = renamed.getByLabel('Due date');
    await due.fill(day(1));
    await expect(due).toHaveValue(day(1));
    await renamed.getByRole('button', { name: 'Remove due date' }).click();
    await expect(due).toHaveValue('');
    await due.fill(day(1));
    await expect(due).toHaveValue(day(1));

    const description = renamed.getByRole('textbox', { name: 'Description' });
    await description.fill('Draft the changelog.');
    await renamed.getByRole('button', { name: 'Save' }).click();
    await expect(renamed.getByRole('button', { name: 'Save' })).toBeHidden();
    await expect(description).toHaveValue('Draft the changelog.');

    await renamed.getByRole('button', { name: 'Close' }).click();
    await expect(page).toHaveURL(`/b/${boardId}`);
    const card = tile(page, 'Write release notes');
    await expect(
      card.getByRole('checkbox', { name: 'Completed' }),
    ).toBeChecked();
    await expect(card.getByText('Tomorrow')).toBeVisible();

    await card.click();
    await page.reload();
    const reloaded = detail(page, 'Write release notes');
    await expect(
      reloaded.getByRole('checkbox', { name: 'Completed' }),
    ).toBeChecked();
    await expect(reloaded.getByLabel('Due date')).toHaveValue(day(1));
    await expect(
      reloaded.getByRole('textbox', { name: 'Description' }),
    ).toHaveValue('Draft the changelog.');
  });

  // FCD-32
  test('moves the card and shows the new column in the header', async ({
    page,
    request,
  }) => {
    await openSeededBoard(page, request);

    await tile(page, 'Clean backlog').click();
    const panel = detail(page, 'Clean backlog');
    await expect(panel.getByText('To do', { exact: true })).toBeVisible();
    await panel.getByRole('button', { name: 'Move to…' }).click();
    await page
      .getByRole('dialog', { name: 'Move to…' })
      .getByRole('button', { name: 'Doing' })
      .click();

    await expect(page.getByText('Task moved to Doing')).toBeVisible();
    await expect(panel).toBeVisible();
    await expect(panel.getByText('Doing', { exact: true })).toBeVisible();
  });

  // FCD-33, FCD-35, FCD-36, FCD-38 and FCD-11
  test('archives, restores to the end of the column and deletes the card', async ({
    page,
    request,
  }) => {
    const { boardId, cardIds } = await openSeededBoard(page, request);

    await tile(page, 'Write notes').click();
    const panel = detail(page, 'Write notes');
    await panel.getByRole('button', { name: 'Archive' }).click();
    await expect(page.getByText('Task archived')).toBeVisible();
    await expect(panel.getByText('Archived task · read-only')).toBeVisible();
    await expect(panel.getByRole('textbox', { name: 'Title' })).toBeDisabled();

    await panel.getByRole('button', { name: 'Restore' }).click();
    await expect(page.getByText('Task restored')).toBeVisible();
    await expect(panel.getByRole('textbox', { name: 'Title' })).toBeEnabled();
    await panel.getByRole('button', { name: 'Close' }).click();
    await expect
      .poll(() => tileTitles(page, 'To do'))
      .toEqual(['Clean backlog', 'Tag release', 'Write notes']);

    await tile(page, 'Write notes').click();
    await panel.getByRole('button', { name: 'Archive' }).click();
    await panel.getByRole('button', { name: 'Delete permanently' }).click();
    await page
      .getByRole('alertdialog', { name: 'Delete this task permanently?' })
      .getByRole('button', { name: 'Delete permanently' })
      .click();
    await expect(page).toHaveURL(`/b/${boardId}`);
    await expect(page.getByText('Task permanently deleted')).toBeVisible();
    await expect(tile(page, 'Write notes')).toHaveCount(0);

    await page.goto(`/b/${boardId}/t/${cardIds['Write notes']}`);
    await expect(page.getByText('This task no longer exists')).toBeVisible();
    await page
      .getByRole('alert')
      .getByRole('button', { name: 'Close' })
      .click();
    await expect(page).toHaveURL(`/b/${boardId}`);
  });

  // FCD-42
  test('asks before discarding an unsaved description', async ({
    page,
    request,
  }) => {
    await openSeededBoard(page, request);

    await tile(page, 'Tag release').click();
    const panel = detail(page, 'Tag release');
    await panel
      .getByRole('textbox', { name: 'Description' })
      .fill('Half written');
    await page.keyboard.press('Escape');

    const confirm = page.getByRole('alertdialog', { name: 'Discard changes?' });
    await expect(confirm.getByText('You have unsaved edits.')).toBeVisible();
    await expect(
      confirm.getByRole('button', { name: 'Keep editing' }),
    ).toBeVisible();
    await confirm.getByRole('button', { name: 'Discard' }).click();
    await expect(panel).toBeHidden();
  });

  // FCD-05 and FCD-40
  test('shows a card of an archived board read-only', async ({
    page,
    request,
  }) => {
    const { boardId, cardIds } = await seedBoard(
      request,
      session[TOKEN_KEY],
      COLUMNS,
    );
    await apiClient(request, session[TOKEN_KEY])(`/boards/${boardId}/archive`);

    await page.goto(`/b/${boardId}/t/${cardIds['Run tests']}`);
    const panel = detail(page, 'Run tests');
    await expect(panel.getByText('Archived board · read-only')).toBeVisible();
    await expect(column(page, 'Doing')).toBeAttached();
    await expect(panel.getByRole('textbox', { name: 'Title' })).toBeDisabled();
    await expect(
      panel.getByRole('checkbox', { name: 'Completed' }),
    ).toBeDisabled();
    await expect(panel.getByLabel('Due date')).toBeDisabled();
    await expect(
      panel.getByRole('textbox', { name: 'Description' }),
    ).toBeDisabled();
    for (const name of [
      'Move to…',
      'Archive',
      'Restore',
      'Delete permanently',
    ]) {
      await expect(panel.getByRole('button', { name })).toHaveCount(0);
    }
    await expect(panel.getByText(/^Created /)).toBeVisible();
  });

  // FCD-04
  test('fills the screen with a Back button on a phone', async ({
    page,
    request,
  }) => {
    await page.setViewportSize(PHONE_VIEWPORT);
    const { boardId } = await openSeededBoard(page, request);

    await tile(page, 'Run tests').click();
    const panel = detail(page, 'Run tests');
    await expect(panel.getByRole('button', { name: 'Back' })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Close' })).toBeHidden();
    const box = (await panel.boundingBox())!;
    expect(box).toEqual({ x: 0, y: 0, ...PHONE_VIEWPORT });

    await panel.getByRole('button', { name: 'Back' }).click();
    await expect(page).toHaveURL(`/b/${boardId}`);
  });

  // FCD-03: a short window caps the modal height, the overlay must not scroll
  test('keeps the modal inside a short desktop window', async ({
    page,
    request,
  }) => {
    await page.setViewportSize(SHORT_DESKTOP_VIEWPORT);
    await openSeededBoard(page, request);

    await tile(page, 'Run tests').click();
    await expect(detail(page, 'Run tests')).toBeVisible();
    const overlay = page.getByTestId('card-detail-overlay');
    const { scrollHeight, clientHeight } = await overlay.evaluate(
      (element) => ({
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
      }),
    );
    expect(scrollHeight).toBeLessThanOrEqual(clientHeight);
  });
});
