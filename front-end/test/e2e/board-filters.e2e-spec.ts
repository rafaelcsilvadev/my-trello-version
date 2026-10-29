import {
  type APIRequestContext,
  expect,
  type Locator,
  type Page,
  test,
} from '@playwright/test';

const API_URL = 'http://localhost:3000/api/v1';
const PASSWORD = 'e2e-password';
const PHONE_VIEWPORT = { width: 375, height: 812 };
const TOKEN_KEY = 'my-trello.token';

type SeedCard = { title: string; labels?: string[]; due?: number };

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
  await page.getByLabel('Name').fill('E2E Filters');
  await page.getByLabel('Email').fill(`e2e-filters-${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL('/boards');
  return page.evaluate(() => ({ ...localStorage }));
}

// The screen has no label or due date editor yet, so the board is seeded through the API.
async function seedBoard(
  request: APIRequestContext,
  token: string,
  title: string,
  columns: Record<string, SeedCard[]>,
) {
  const headers = { Authorization: `Bearer ${token}` };
  async function post(path: string, data: object) {
    const response = await request.post(`${API_URL}${path}`, {
      headers,
      data,
    });
    expect(response.ok()).toBe(true);
    return (await response.json()) as { id: string };
  }
  async function put(path: string) {
    const response = await request.put(`${API_URL}${path}`, { headers });
    expect(response.ok()).toBe(true);
  }

  const board = await post('/boards', { title });
  const labelIds: Record<string, string> = {};
  for (const [name, color] of [
    ['Bug', 'red'],
    ['Docs', 'blue'],
    ['Chore', 'green'],
  ]) {
    labelIds[name] = (
      await post(`/boards/${board.id}/labels`, { name, color })
    ).id;
  }
  for (const [name, cards] of Object.entries(columns)) {
    const list = await post(`/boards/${board.id}/lists`, { title: name });
    for (const { title, labels = [], due } of cards) {
      const card = await post(`/lists/${list.id}/cards`, {
        title,
        ...(due === undefined ? {} : { dueDate: day(due) }),
      });
      for (const label of labels) {
        await put(`/cards/${card.id}/labels/${labelIds[label]}`);
      }
    }
  }
  return board.id;
}

const COLUMNS: Record<string, SeedCard[]> = {
  'To do': [
    { title: 'Planejar ação de lançamento', labels: ['Bug'], due: -1 },
    { title: 'Write notes', labels: ['Docs'], due: 0 },
    { title: 'Clean backlog', labels: ['Chore'] },
  ],
  Doing: [
    { title: 'Run tests', labels: ['Bug', 'Chore'], due: 0 },
    { title: 'Tag release', due: 1 },
  ],
};

function column(page: Page, name: string) {
  return page.getByRole('region', { name });
}

function visibleTitles(page: Page) {
  return page
    .locator('[data-card-id]')
    .evaluateAll((tiles) =>
      tiles.map((tile) => tile.getAttribute('aria-label')),
    );
}

function search(page: Page) {
  return page.getByRole('textbox', { name: 'Search this board…' });
}

function dueSelect(page: Page) {
  return page.getByRole('combobox', { name: 'Due date' });
}

function summary(page: Page) {
  return page.getByRole('search').getByRole('status');
}

async function checkLabels(page: Page, names: string[]) {
  await page.getByRole('button', { name: /^Labels/ }).click();
  const menu = page.getByRole('menu');
  for (const name of names) {
    await menu.getByRole('menuitemcheckbox', { name }).click();
  }
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
}

function moveRequests(page: Page) {
  const sent: string[] = [];
  page.on('request', (request) => {
    if (
      request.method() === 'POST' &&
      new URL(request.url()).pathname.endsWith('/move')
    ) {
      sent.push(request.url());
    }
  });
  return sent;
}

async function dragTo(source: Locator, target: Locator) {
  const box = (await target.boundingBox())!;
  await source.dragTo(target, {
    targetPosition: { x: box.width / 2, y: box.height - 8 },
  });
}

test.describe('board search and filters', () => {
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

  async function openSeededBoard(
    page: Page,
    request: APIRequestContext,
    title = 'Launch plan',
  ) {
    const boardId = await seedBoard(
      request,
      session[TOKEN_KEY],
      title,
      COLUMNS,
    );
    await page.goto(`/b/${boardId}`);
    await expect(column(page, 'Doing')).toBeVisible();
  }

  // FBF-02
  test('finds a card by searching without accents', async ({
    page,
    request,
  }) => {
    await openSeededBoard(page, request);

    await search(page).fill('ACAO');
    await expect
      .poll(() => visibleTitles(page))
      .toEqual(['Planejar ação de lançamento']);
    await expect(summary(page)).toHaveText('1 task');
  });

  // FBF-10
  test('shows the cards that carry any checked label', async ({
    page,
    request,
  }) => {
    await openSeededBoard(page, request);

    await checkLabels(page, ['Docs', 'Chore']);
    await expect(
      page.getByRole('button', { name: 'Labels · 2' }),
    ).toBeVisible();
    await expect
      .poll(() => visibleTitles(page))
      .toEqual(['Write notes', 'Clean backlog', 'Run tests']);
    await expect(summary(page)).toHaveText('3 tasks');
  });

  // FBF-17 and FBF-18
  test('filters overdue cards and cards due today', async ({
    page,
    request,
  }) => {
    await openSeededBoard(page, request);

    await dueSelect(page).selectOption({ label: 'Overdue' });
    await expect
      .poll(() => visibleTitles(page))
      .toEqual(['Planejar ação de lançamento']);

    await dueSelect(page).selectOption({ label: 'Due today' });
    await expect
      .poll(() => visibleTitles(page))
      .toEqual(['Write notes', 'Run tests']);
    await expect(summary(page)).toHaveText('2 tasks');
  });

  // FBF-31 and FBF-34
  test('turns drag off while filtering and still moves with Move to…', async ({
    page,
    request,
  }) => {
    await openSeededBoard(page, request);
    const sent = moveRequests(page);

    await search(page).fill('notes');
    await expect(
      page.getByText('Dragging is off while filters are applied'),
    ).toBeVisible();
    const card = column(page, 'To do').getByRole('button', {
      name: 'Write notes',
    });
    await expect(card).toHaveAttribute('draggable', 'false');
    await dragTo(card, column(page, 'Doing'));
    // The header loses its move handle; dragging the title moves nothing either.
    await expect(
      page.getByRole('button', { name: 'Column To do. Space to move' }),
    ).toHaveCount(0);
    await dragTo(
      column(page, 'To do').getByRole('button', { name: 'To do', exact: true }),
      column(page, 'Doing'),
    );
    expect(sent).toEqual([]);
    await expect(column(page, 'To do').getByText('Write notes')).toBeVisible();

    await column(page, 'To do')
      .getByRole('button', { name: 'Move to…' })
      .click();
    await page.getByRole('menuitem', { name: 'Move to…' }).click();
    await page
      .getByRole('dialog', { name: 'Move to…' })
      .getByRole('button', { name: 'Doing' })
      .click();
    await expect(page.getByText('Task moved to Doing')).toBeVisible();
    await expect(column(page, 'Doing').getByText('Write notes')).toBeVisible();
    expect(sent).toHaveLength(1);
  });

  // FBF-25
  test('clears every filter but keeps Show archived', async ({
    page,
    request,
  }) => {
    await openSeededBoard(page, request);
    await page.getByText('Show archived').click();
    const showArchived = page.getByRole('switch', { name: 'Show archived' });
    await expect(showArchived).toBeChecked();

    await search(page).fill('zzz');
    await checkLabels(page, ['Bug']);
    await dueSelect(page).selectOption({ label: 'Overdue' });
    await expect(page.getByText('No tasks found')).toBeVisible();

    await page
      .getByRole('search')
      .getByRole('button', { name: 'Clear filters' })
      .click();
    await expect(search(page)).toHaveValue('');
    await expect(page.getByRole('button', { name: 'Labels' })).toBeVisible();
    await expect(dueSelect(page)).toHaveValue('any');
    await expect(showArchived).toBeChecked();
    await expect.poll(() => visibleTitles(page)).toHaveLength(5);
  });

  // FBF-37
  test('starts with empty filters after leaving and reopening the board', async ({
    page,
    request,
  }) => {
    // Its own title, so the link below opens this board and not an older one.
    await openSeededBoard(page, request, 'Reopen plan');
    await search(page).fill('notes');
    await checkLabels(page, ['Docs']);
    await dueSelect(page).selectOption({ label: 'Due today' });

    await page
      .getByRole('navigation', { name: 'Breadcrumb' })
      .getByRole('link', { name: 'My boards' })
      .click();
    await expect(page).toHaveURL('/boards');
    await page.getByRole('link', { name: 'Reopen plan' }).click();

    await expect(column(page, 'Doing')).toBeVisible();
    await expect(search(page)).toHaveValue('');
    await expect(page.getByRole('button', { name: 'Labels' })).toBeVisible();
    await expect(dueSelect(page)).toHaveValue('any');
    await expect(summary(page)).toBeHidden();
    await expect.poll(() => visibleTitles(page)).toHaveLength(5);
  });

  // FBF-41
  test('gives the search field the full toolbar width on a phone', async ({
    page,
    request,
  }) => {
    await page.setViewportSize(PHONE_VIEWPORT);
    await openSeededBoard(page, request);

    const toolbar = (await page.getByRole('search').boundingBox())!;
    const field = (await search(page).locator('..').boundingBox())!;
    expect(field.width).toBeCloseTo(toolbar.width, 0);
    await expect(page.getByRole('search').getByText('/')).toBeHidden();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
});
