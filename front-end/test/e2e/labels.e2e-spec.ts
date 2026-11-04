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

// One sign-up for the whole file: the auth routes allow 10 requests a minute.
async function signUp(page: Page) {
  await page.goto('/signup');
  await page.getByLabel('Name').fill('E2E Labels');
  await page.getByLabel('Email').fill(`e2e-labels-${Date.now()}@example.com`);
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

type Send = ReturnType<typeof apiClient>;

async function createLabels(
  send: Send,
  boardId: string,
  labels: [name: string, color: string][],
) {
  const ids: Record<string, string> = {};
  for (const [name, color] of labels) {
    ids[name] = (
      await send('post', `/boards/${boardId}/labels`, { name, color })
    ).id;
  }
  return ids;
}

// A board with "Bug" on two cards (one archived) and "Idea" on none.
async function seedBoard(request: APIRequestContext, token: string) {
  const send = apiClient(request, token);
  const board = await send('post', '/boards', { title: 'Labels plan' });
  const ids = await createLabels(send, board.id, [
    ['Bug', 'red'],
    ['Idea', 'blue'],
  ]);
  const list = await send('post', `/boards/${board.id}/lists`, {
    title: 'To do',
  });
  const cardIds: string[] = [];
  for (const title of ['Fix login', 'Fix logout']) {
    const card = await send('post', `/lists/${list.id}/cards`, { title });
    await send('put', `/cards/${card.id}/labels/${ids['Bug']}`);
    cardIds.push(card.id);
  }
  await send('post', `/cards/${cardIds[1]}/archive`);
  return { boardId: board.id, send };
}

function row(page: Page, name: string): Locator {
  return page.getByRole('listitem').filter({ hasText: name });
}

function dialog(page: Page, name: string) {
  return page.getByRole('dialog', { name, exact: true });
}

// React Aria hides the native radio under the styled box: click its label.
function pickColor(scope: Locator, color: string) {
  return scope
    .locator('label', {
      has: scope.page().getByRole('radio', { name: color, exact: true }),
    })
    .click();
}

test.describe('labels page', () => {
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

  // FLP-01 and FLP-08
  test('lists the labels with their usage and deletes one with the count', async ({
    page,
    request,
  }) => {
    const { boardId } = await seedBoard(request, session[TOKEN_KEY]);

    await page.goto(`/b/${boardId}/labels`);
    await expect(
      page.getByRole('heading', { name: 'Labels', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('Labels plan · Apply to this board only.'),
    ).toBeVisible();
    await expect(row(page, 'Bug')).toContainText('used in 2 tasks');
    await expect(row(page, 'Idea')).toContainText('unused');

    await page.getByRole('button', { name: 'Delete label Bug' }).click();
    const confirm = page.getByRole('alertdialog', {
      name: 'Delete the label Bug?',
      exact: true,
    });
    await expect(
      confirm.getByText('It will be removed from 2 tasks.'),
    ).toBeVisible();
    await confirm.getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(page.getByText('Label deleted')).toBeVisible();
    await expect(row(page, 'Bug')).toHaveCount(0);

    await page.getByRole('link', { name: 'Labels plan' }).click();
    await expect(page).toHaveURL(`/b/${boardId}`);
    await expect(
      page.getByRole('button', { name: 'Fix login', exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Bug', { exact: true })).toHaveCount(0);
  });

  // FLP-16
  test('creates, renames with a duplicate name, recolors and keeps it on reload', async ({
    page,
    request,
  }) => {
    const { boardId } = await seedBoard(request, session[TOKEN_KEY]);
    await page.goto(`/b/${boardId}/labels`);

    await page.getByRole('button', { name: 'New label' }).click();
    const form = dialog(page, 'New label');
    await form.getByRole('textbox', { name: 'Name' }).fill('Chore');
    await pickColor(form, 'Green');
    await form.getByRole('button', { name: 'Create label' }).click();
    await expect(page.getByText('Label created')).toBeVisible();
    await expect(row(page, 'Chore')).toContainText('unused');

    await page.getByRole('button', { name: 'Edit label Chore' }).click();
    const edit = dialog(page, 'Edit label');
    const name = edit.getByRole('textbox', { name: 'Name' });
    await name.fill('bug');
    await edit.getByRole('button', { name: 'Save' }).click();
    await expect(edit.getByRole('alert')).toHaveText(
      'A label with that name already exists on this board',
    );
    await expect(name).toHaveAttribute('aria-invalid', 'true');

    await name.fill('Chores');
    await pickColor(edit, 'Purple');
    await edit.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Label saved')).toBeVisible();
    await expect(row(page, 'Chores')).toBeVisible();

    await page.reload();
    await expect(row(page, 'Chores')).toContainText('unused');
    await page.getByRole('button', { name: 'Edit label Chores' }).click();
    await expect(
      dialog(page, 'Edit label').getByRole('radio', {
        name: 'Purple',
        exact: true,
      }),
    ).toBeChecked();
  });

  // FLP-04
  test('shows the empty state on a board without labels', async ({
    page,
    request,
  }) => {
    const board = await apiClient(request, session[TOKEN_KEY])(
      'post',
      '/boards',
      {
        title: 'No labels',
      },
    );

    await page.goto(`/b/${board.id}/labels`);
    await expect(page.getByText('No labels yet')).toBeVisible();
    await expect(
      page.getByText('Create labels to highlight tasks, like Bug or Urgent.'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'New label' })).toBeVisible();
  });

  // FLP-27
  test('shows an archived board read-only', async ({ page, request }) => {
    const { boardId, send } = await seedBoard(request, session[TOKEN_KEY]);
    await send('post', `/boards/${boardId}/archive`);

    await page.goto(`/b/${boardId}/labels`);
    await expect(page.getByText('Archived board · read-only')).toBeVisible();
    await expect(row(page, 'Bug')).toContainText('used in 2 tasks');
    await expect(page.getByRole('button', { name: 'New label' })).toHaveCount(
      0,
    );
    await expect(page.getByRole('button', { name: /^Edit label/ })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole('button', { name: /^Delete label/ }),
    ).toHaveCount(0);
  });
});
