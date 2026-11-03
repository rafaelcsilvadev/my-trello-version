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
  await page.getByLabel('Name').fill('E2E Card Labels');
  await page
    .getByLabel('Email')
    .fill(`e2e-card-labels-${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL('/boards');
  return page.evaluate(() => ({ ...localStorage }));
}

function apiClient(request: APIRequestContext, token: string) {
  const headers = { Authorization: `Bearer ${token}` };
  return async function send(
    method: 'post' | 'put',
    path: string,
    data?: object,
  ) {
    const response = await request[method](`${API_URL}${path}`, {
      headers,
      data,
    });
    expect(response.ok()).toBe(true);
    return method === 'put'
      ? { id: '' }
      : ((await response.json()) as { id: string });
  };
}

// A board with the labels "Bug" and "Docs" and one card without labels.
async function seedCard(
  request: APIRequestContext,
  token: string,
): Promise<SeededCard & { labelIds: Record<string, string> }> {
  const send = apiClient(request, token);
  const board = await send('post', '/boards', { title: 'Labels plan' });
  const labelIds: Record<string, string> = {};
  for (const [name, color] of [
    ['Bug', 'red'],
    ['Docs', 'blue'],
  ]) {
    labelIds[name] = (
      await send('post', `/boards/${board.id}/labels`, { name, color })
    ).id;
  }
  const list = await send('post', `/boards/${board.id}/lists`, {
    title: 'To do',
  });
  const card = await send('post', `/lists/${list.id}/cards`, {
    title: 'Write the brief',
  });
  return { boardId: board.id, cardId: card.id, labelIds };
}

function tile(page: Page, title: string) {
  return page.getByRole('button', { name: title, exact: true });
}

function detail(page: Page, title: string) {
  return page.getByRole('dialog', { name: title, exact: true });
}

function addButton(panel: Locator) {
  return panel.getByRole('button', { name: 'Add label' });
}

function popover(page: Page) {
  return page.getByRole('dialog', { name: 'Labels', exact: true });
}

function appliedChips(panel: Locator) {
  return panel.getByRole('list', { name: 'Labels' });
}

// React Aria hides the native input under the styled box: click its label.
function tick(scope: Locator, name: string) {
  return scope
    .locator('label', {
      has: scope.page().getByRole('checkbox', { name, exact: true }),
    })
    .click();
}

test.describe('card labels', () => {
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
    return { ...seeded, panel: detail(page, 'Write the brief') };
  }

  // FCLB-01, FCLB-02, FCLB-09 and FCLB-10
  test('opens the popover with the search focused and filters the labels', async ({
    page,
    request,
  }) => {
    const { panel } = await openSeededCard(page, request);

    await addButton(panel).click();
    const search = page.getByRole('textbox', { name: 'Search labels…' });
    await expect(popover(page)).toBeVisible();
    await expect(search).toBeFocused();
    await expect(popover(page).getByRole('checkbox')).toHaveCount(2);

    await search.fill('bu');
    await expect(popover(page).getByRole('checkbox')).toHaveCount(1);
    await expect(
      popover(page).getByRole('checkbox', { name: 'Bug', exact: true }),
    ).toBeAttached();

    await search.fill('zzz');
    await expect(popover(page).getByRole('checkbox')).toHaveCount(0);
    await expect(popover(page).getByText('No labels found')).toBeVisible();
  });

  // FCLB-04 and FCLB-05
  test('applies a label to the detail and the tile and removes it', async ({
    page,
    request,
  }) => {
    const { boardId, cardId, panel } = await openSeededCard(page, request);

    await addButton(panel).click();
    await tick(popover(page), 'Bug');
    await expect(
      popover(page).getByRole('checkbox', { name: 'Bug', exact: true }),
    ).toBeChecked();
    await expect(appliedChips(panel).getByText('Bug')).toBeVisible();

    // The first Esc closes the popover, the second the detail.
    await page.keyboard.press('Escape');
    await expect(popover(page)).toBeHidden();
    await expect(addButton(panel)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(`/b/${boardId}`);
    await expect(tile(page, 'Write the brief').getByText('Bug')).toBeVisible();

    await page.goto(`/b/${boardId}/t/${cardId}`);
    await expect(appliedChips(panel).getByText('Bug')).toBeVisible();
    await addButton(panel).click();
    await tick(popover(page), 'Bug');
    await expect(
      popover(page).getByRole('checkbox', { name: 'Bug', exact: true }),
    ).not.toBeChecked();
    await expect(appliedChips(panel)).toHaveCount(0);

    await page.reload();
    await expect(panel).toBeVisible();
    await expect(appliedChips(panel)).toHaveCount(0);
  });

  // FCLB-08
  test('closes the popover first and the detail second on Esc', async ({
    page,
    request,
  }) => {
    const { boardId, panel } = await openSeededCard(page, request);

    await addButton(panel).click();
    await expect(popover(page)).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(popover(page)).toBeHidden();
    await expect(panel).toBeVisible();
    await expect(addButton(panel)).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(page).toHaveURL(`/b/${boardId}`);
  });

  // FCLB-14 and FCLB-15
  test('rejects a taken name and creates, applies and lists a new label', async ({
    page,
    request,
  }) => {
    const { panel } = await openSeededCard(page, request);

    await addButton(panel).click();
    await popover(page).getByRole('button', { name: 'Create label' }).click();

    const name = popover(page).getByRole('textbox', { name: 'Name' });
    await name.fill('bug');
    await name.press('Enter');
    await expect(popover(page).getByRole('alert')).toHaveText(
      'A label with that name already exists on this board',
    );
    await expect(name).toHaveAttribute('aria-invalid', 'true');

    await name.fill('Errands');
    await popover(page)
      .locator('label', {
        has: page.getByRole('radio', { name: 'Orange', exact: true }),
      })
      .click();
    await popover(page).getByRole('button', { name: 'Create' }).click();

    await expect(page.getByText('Label created')).toBeVisible();
    await expect(
      popover(page).getByRole('checkbox', { name: 'Errands', exact: true }),
    ).toBeChecked();
    await expect(appliedChips(panel).getByText('Errands')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(popover(page)).toBeHidden();
    await expect(addButton(panel)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(
      tile(page, 'Write the brief').getByText('Errands'),
    ).toBeVisible();

    await page.getByRole('button', { name: /^Labels/ }).click();
    await expect(
      page.getByRole('menu').getByRole('menuitemcheckbox', { name: 'Errands' }),
    ).toBeVisible();
  });

  // FCLB-21
  test('shows the chips of an archived card without the add button', async ({
    page,
    request,
  }) => {
    const { boardId, cardId, labelIds } = await seedCard(
      request,
      session[TOKEN_KEY],
    );
    const send = apiClient(request, session[TOKEN_KEY]);
    await send('put', `/cards/${cardId}/labels/${labelIds['Bug']}`);
    await send('post', `/cards/${cardId}/archive`);

    await page.goto(`/b/${boardId}/t/${cardId}`);
    const panel = detail(page, 'Write the brief');
    await expect(appliedChips(panel).getByText('Bug')).toBeVisible();
    await expect(addButton(panel)).toHaveCount(0);
  });
});
