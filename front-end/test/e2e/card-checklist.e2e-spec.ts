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

type SeededCard = { boardId: string; cardId: string };

// One sign-up for the whole file: the auth routes allow 10 requests a minute.
async function signUp(page: Page) {
  await page.goto('/signup');
  await page.getByLabel('Name').fill('E2E Card Checklist');
  await page
    .getByLabel('Email')
    .fill(`e2e-card-checklist-${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL('/boards');
  return page.evaluate(() => ({ ...localStorage }));
}

function apiClient(request: APIRequestContext, token: string) {
  const headers = { Authorization: `Bearer ${token}` };
  return async function send(
    method: 'post' | 'patch',
    path: string,
    data?: object,
  ) {
    const response = await request[method](`${API_URL}${path}`, {
      headers,
      data,
    });
    expect(response.ok()).toBe(true);
    return (await response.json()) as { id: string };
  };
}

// A board with one card whose checklist is "Draft" (done), "Review", "Send".
async function seedCard(
  request: APIRequestContext,
  token: string,
): Promise<SeededCard> {
  const send = apiClient(request, token);
  const board = await send('post', '/boards', { title: 'Checklist plan' });
  const list = await send('post', `/boards/${board.id}/lists`, {
    title: 'To do',
  });
  const card = await send('post', `/lists/${list.id}/cards`, {
    title: 'Write the brief',
  });
  const itemIds: string[] = [];
  for (const text of ['Draft', 'Review', 'Send']) {
    itemIds.push(
      (await send('post', `/cards/${card.id}/checklist-items`, { text })).id,
    );
  }
  await send('patch', `/checklist-items/${itemIds[0]}`, { done: true });
  return { boardId: board.id, cardId: card.id };
}

function tile(page: Page, title: string) {
  return page.getByRole('button', { name: title, exact: true });
}

function detail(page: Page, title: string) {
  return page.getByRole('dialog', { name: title, exact: true });
}

function checklist(panel: Locator) {
  return panel.locator('section', {
    has: panel.page().getByRole('heading', { name: 'Checklist' }),
  });
}

function itemTexts(section: Locator) {
  return section
    .getByRole('textbox', { name: /^Edit item/ })
    .evaluateAll((fields) =>
      fields.map((field) => (field as HTMLInputElement).value),
    );
}

// React Aria hides the native input under the styled box: click its label.
function tick(section: Locator, text: string) {
  return section
    .locator('label', {
      has: section.page().getByRole('checkbox', { name: text, exact: true }),
    })
    .click();
}

test.describe('card checklist', () => {
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
    await page.goto(`/b/${seeded.boardId}`);
    await tile(page, 'Write the brief').click();
    const panel = detail(page, 'Write the brief');
    await expect(checklist(panel).getByText('1/3')).toBeVisible();
    return { ...seeded, panel, section: checklist(panel) };
  }

  // FCL-01, FCL-05, FCL-12, FCL-13 and FCL-16
  test('shows the items in order and adds, validates and ticks items', async ({
    page,
    request,
  }) => {
    const { section } = await openSeededCard(page, request);

    expect(await itemTexts(section)).toEqual(['Draft', 'Review', 'Send']);
    await expect(
      section.getByRole('progressbar', { name: 'Checklist' }),
    ).toHaveAttribute('aria-valuetext', '1/3');

    const add = section.getByRole('textbox', {
      name: 'Add an item and press Enter',
    });
    await add.fill('Publish');
    await add.press('Enter');
    await expect
      .poll(() => itemTexts(section))
      .toEqual(['Draft', 'Review', 'Send', 'Publish']);
    await expect(add).toHaveValue('');
    await expect(add).toBeFocused();
    await expect(section.getByText('1/4')).toBeVisible();

    await add.press('Enter');
    await expect(section.getByRole('alert')).toHaveText('Write the item');
    expect(await itemTexts(section)).toHaveLength(4);

    await tick(section, 'Review');
    await expect(
      section.getByRole('checkbox', { name: 'Review', exact: true }),
    ).toBeChecked();
    await expect(section.getByText('2/4')).toBeVisible();
  });

  // FCL-18, FCL-24 and FCL-39
  test('keeps a renamed item and a deletion after a reload and updates the tile', async ({
    page,
    request,
  }) => {
    const { boardId, cardId, panel, section } = await openSeededCard(
      page,
      request,
    );

    const review = section.getByRole('textbox', { name: 'Edit item “Review”' });
    await review.fill('  Review twice  ');
    await review.press('Enter');
    await expect(
      section.getByRole('textbox', { name: 'Edit item “Review twice”' }),
    ).toHaveValue('Review twice');

    await section.getByRole('button', { name: 'Delete item “Send”' }).click();
    await expect
      .poll(() => itemTexts(section))
      .toEqual(['Draft', 'Review twice']);
    await expect(section.getByText('1/2')).toBeVisible();

    await panel.getByRole('button', { name: 'Close' }).click();
    await expect(page).toHaveURL(`/b/${boardId}`);
    await expect(tile(page, 'Write the brief').getByText('1/2')).toBeVisible();

    await page.goto(`/b/${boardId}/t/${cardId}`);
    const reloaded = checklist(detail(page, 'Write the brief'));
    await expect(reloaded.getByText('1/2')).toBeVisible();
    expect(await itemTexts(reloaded)).toEqual(['Draft', 'Review twice']);
  });

  // FCL-28 and FCL-30
  test('asks before discarding an unsaved item edit', async ({
    page,
    request,
  }) => {
    const { panel, section } = await openSeededCard(page, request);

    // Esc inside the field only undoes the edit and keeps the detail open.
    const review = section.getByRole('textbox', { name: 'Edit item “Review”' });
    await review.fill('Review twice');
    await review.press('Escape');
    await expect(review).toHaveValue('Review');
    await expect(panel).toBeVisible();

    // An empty text is not saved on blur, so the edit stays unsaved.
    await review.fill('');
    await review.press('Tab');
    await expect(section.getByRole('alert')).toHaveText('Write the item');
    await page.keyboard.press('Escape');

    const confirm = page.getByRole('alertdialog', { name: 'Discard changes?' });
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: 'Discard' }).click();
    await expect(panel).toBeHidden();
  });

  // FCL-31
  test('locks the items of an archived card', async ({ page, request }) => {
    const { boardId, cardId } = await seedCard(request, session[TOKEN_KEY]);
    await apiClient(request, session[TOKEN_KEY])(
      'post',
      `/cards/${cardId}/archive`,
    );

    await page.goto(`/b/${boardId}/t/${cardId}`);
    const section = checklist(detail(page, 'Write the brief'));
    await expect(section.getByText('1/3')).toBeVisible();
    for (const text of ['Draft', 'Review', 'Send']) {
      await expect(
        section.getByRole('checkbox', { name: text, exact: true }),
      ).toBeDisabled();
      await expect(
        section.getByRole('textbox', { name: `Edit item “${text}”` }),
      ).toBeDisabled();
    }
    await expect(section.getByRole('button')).toHaveCount(0);
    await expect(
      section.getByRole('textbox', { name: 'Add an item and press Enter' }),
    ).toHaveCount(0);
  });
});
