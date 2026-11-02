import {
  type APIRequestContext,
  expect,
  type Locator,
  type Page,
  test,
} from '@playwright/test';

const API_URL = 'http://localhost:3000/api/v1';
const PASSWORD = 'e2e-password';
const TOKEN_KEY = 'my-trello.token';
const CARD_TITLE = 'Write the brief';

type SeededCard = { boardId: string; cardId: string };

// One sign-up for the whole file: the auth routes allow 10 requests a minute.
async function signUp(page: Page) {
  await page.goto('/signup');
  await page.getByLabel('Name').fill('E2E Checklist Moves');
  await page
    .getByLabel('Email')
    .fill(`e2e-checklist-dnd-${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL('/boards');
  return page.evaluate(() => ({ ...localStorage }));
}

function apiClient(request: APIRequestContext, token: string) {
  const headers = { Authorization: `Bearer ${token}` };
  return async function send(method: 'post', path: string, data?: object) {
    const response = await request[method](`${API_URL}${path}`, {
      headers,
      data,
    });
    expect(response.ok()).toBe(true);
    return (await response.json()) as { id: string };
  };
}

// A board with one card whose checklist is "A", "B", "C".
async function seedCard(
  request: APIRequestContext,
  token: string,
): Promise<SeededCard> {
  const send = apiClient(request, token);
  const board = await send('post', '/boards', { title: 'Checklist moves' });
  const list = await send('post', `/boards/${board.id}/lists`, {
    title: 'To do',
  });
  const card = await send('post', `/lists/${list.id}/cards`, {
    title: CARD_TITLE,
  });
  for (const text of ['A', 'B', 'C']) {
    await send('post', `/cards/${card.id}/checklist-items`, { text });
  }
  return { boardId: board.id, cardId: card.id };
}

function detail(page: Page) {
  return page.getByRole('dialog', { name: CARD_TITLE, exact: true });
}

function checklist(panel: Locator) {
  return panel.locator('section', {
    has: panel.page().getByRole('heading', { name: 'Checklist' }),
  });
}

function grip(section: Locator, text: string) {
  return section.getByRole('button', {
    name: `Reorder the item ${text}`,
    exact: true,
  });
}

function itemTexts(section: Locator) {
  return section
    .getByRole('textbox', { name: /^Edit item/ })
    .evaluateAll((fields) =>
      fields.map((field) => (field as HTMLInputElement).value),
    );
}

// The move request the detail sends for a checklist item.
function moveSaved(page: Page) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      /\/checklist-items\/[^/]+\/move$/.test(new URL(response.url()).pathname),
  );
}

test.describe('card checklist drag and drop', () => {
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

  async function openSeededCard(page: Page, request: APIRequestContext) {
    const seeded = await seedCard(request, session[TOKEN_KEY]);
    await page.goto(`/b/${seeded.boardId}/t/${seeded.cardId}`);
    const panel = detail(page);
    const section = checklist(panel);
    await expect.poll(() => itemTexts(section)).toEqual(['A', 'B', 'C']);
    return { ...seeded, panel, section };
  }

  async function reloadedTexts(page: Page) {
    await page.reload();
    const section = checklist(detail(page));
    await expect(grip(section, 'A')).toBeVisible();
    return itemTexts(section);
  }

  // FCLD-01 and FCLD-05
  test('moves an item with the mouse', async ({ page, request }) => {
    const { section } = await openSeededCard(page, request);

    const saved = moveSaved(page);
    // The top half of A's row, so C lands above A.
    await grip(section, 'C').dragTo(grip(section, 'A').locator('..'), {
      targetPosition: { x: 40, y: 4 },
    });
    expect((await saved).ok()).toBe(true);

    expect(await reloadedTexts(page)).toEqual(['C', 'A', 'B']);
  });

  // FCLD-08 and FCLD-11
  test('moves an item with the keyboard', async ({ page, request }) => {
    const { panel, section } = await openSeededCard(page, request);

    const saved = moveSaved(page);
    await grip(section, 'A').focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(
      panel.getByText(
        'Moving “A”: position 3 of 3. ↑ ↓ move, Space drops, Esc cancels.',
      ),
    ).toBeVisible();
    await page.keyboard.press('Space');
    expect((await saved).ok()).toBe(true);
    await expect(panel.getByText(/^Moving “A”/)).toBeHidden();

    expect(await reloadedTexts(page)).toEqual(['B', 'C', 'A']);
  });

  // FCLD-14
  test('cancels a keyboard move with Esc', async ({ page, request }) => {
    const { panel, section } = await openSeededCard(page, request);

    let moves = 0;
    page.on('request', (sent) => {
      if (sent.method() === 'POST' && sent.url().endsWith('/move')) moves += 1;
    });
    await grip(section, 'A').focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Escape');

    await expect(panel.getByText(/^Moving “A”/)).toBeHidden();
    await expect(panel).toBeVisible();
    expect(await itemTexts(section)).toEqual(['A', 'B', 'C']);
    expect(await reloadedTexts(page)).toEqual(['A', 'B', 'C']);
    expect(moves).toBe(0);
  });

  // FCLD-24
  test('shows no grip on an archived card', async ({ page, request }) => {
    const { boardId, cardId } = await seedCard(request, session[TOKEN_KEY]);
    await apiClient(request, session[TOKEN_KEY])(
      'post',
      `/cards/${cardId}/archive`,
    );

    await page.goto(`/b/${boardId}/t/${cardId}`);
    const section = checklist(detail(page));
    await expect.poll(() => itemTexts(section)).toEqual(['A', 'B', 'C']);
    await expect(
      section.getByRole('button', { name: /^Reorder the item/ }),
    ).toHaveCount(0);
  });
});
