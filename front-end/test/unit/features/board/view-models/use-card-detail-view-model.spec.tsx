import { QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Card } from '@/features/board/model/types';
import { useCardDetailViewModel } from '@/features/board/view-models/use-card-detail-view-model';
import { ApiProvider } from '@/shared/api/api-context';
import { createApiClient } from '@/shared/api/client';
import { createQueryClient } from '@/shared/api/query-client';
import { createI18n } from '@/shared/i18n/i18n';
import { ToastProvider } from '@/shared/ui/toast/toast-provider';

import {
  boardFixture,
  boardId,
  cardFixture,
  labelFixture,
  listFixture,
} from '../../../../support/fixtures/board';
import { server } from '../../../../support/msw/server';

const baseUrl = 'http://api.test';
const boardUrl = `${baseUrl}/api/v1/boards/${boardId}`;
const listsUrl = `${boardUrl}/lists`;
const archivedListsUrl = `${listsUrl}?archived=true`;
const labelsUrl = `${boardUrl}/labels`;
const cardId = 'c1';
const cardUrl = `${baseUrl}/api/v1/cards/${cardId}`;

const stamp = '2026-10-20T12:00:00.000Z';
const backlog = listFixture('l1', { title: 'Backlog' });
const doing = listFixture('l2', { title: 'Doing' });
const ideas = listFixture('l3', { title: 'Ideas', archivedAt: stamp });
const urgent = labelFixture('lb1', { name: 'Urgent', color: 'red' });
const later = labelFixture('lb2', { name: 'Later', color: 'blue' });
const bug = labelFixture('lb3', { name: 'Bug', color: 'orange' });

function problem(
  status: number,
  errors?: { field: string; message: string }[],
) {
  return HttpResponse.json(
    { type: `/problems/${status}`, title: 'Error', status, detail: '', errors },
    {
      status,
      headers: { 'Content-Type': 'application/problem+json' },
    },
  );
}

// `undefined` falls back to the seed.
type Reply = () => Response | undefined | Promise<Response | undefined>;

// Each endpoint answers with its seed unless a test overrides it; `requests` counts the hits.
// The archived lists are keyed by their `?archived=true` URL.
function detailServer(overrides: Partial<Record<string, Reply>> = {}) {
  const requests: Record<string, number> = {};
  const seed: Record<string, JsonBodyType> = {
    [cardUrl]: cardFixture(cardId, backlog.id),
    [boardUrl]: boardFixture(),
    [listsUrl]: [backlog, doing],
    [archivedListsUrl]: [ideas],
    [labelsUrl]: [urgent, later, bug],
  };
  async function reply(url: string) {
    requests[url] = (requests[url] ?? 0) + 1;
    return (await overrides[url]?.()) ?? HttpResponse.json(seed[url] ?? null);
  }
  server.use(
    ...[cardUrl, boardUrl, listsUrl, labelsUrl].map((url) =>
      http.get(url, ({ request }) =>
        reply(
          new URL(request.url).searchParams.get('archived') === 'true'
            ? `${url}?archived=true`
            : url,
        ),
      ),
    ),
  );
  return requests;
}

function setup() {
  const api = createApiClient({
    baseUrl,
    getToken: () => 'token-123',
    onSessionExpired: vi.fn<() => void>(),
  });
  const queryClient = createQueryClient();
  // Keeps the retry policy but skips its backoff, so a 5xx fails fast.
  queryClient.setDefaultOptions({
    queries: { ...queryClient.getDefaultOptions().queries, retryDelay: 0 },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <I18nextProvider i18n={createI18n('pt-BR')}>
      <QueryClientProvider client={queryClient}>
        <ApiProvider client={api}>
          <ToastProvider>{children}</ToastProvider>
        </ApiProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
  return renderHook(() => useCardDetailViewModel(boardId, cardId), {
    wrapper,
  });
}

async function setupReady() {
  const rendered = setup();
  await waitFor(() =>
    expect(rendered.result.current.state.status).toBe('ready'),
  );
  return rendered;
}

type ChangeRequest = { method: string; path: string; body: unknown };

// Records every card write; each one is answered by the next queued response, or by the card.
function cardWrites(...responses: (() => Response | Promise<Response>)[]) {
  const changes: ChangeRequest[] = [];
  server.use(
    http.patch(cardUrl, async ({ request }) => {
      changes.push({
        method: request.method,
        path: new URL(request.url).pathname,
        body: await request.json(),
      });
      return (
        responses.shift() ??
        (() => HttpResponse.json(cardFixture(cardId, backlog.id)))
      )();
    }),
  );
  return changes;
}

// Holds a write until the test opens it, to see the change before the answer.
function gate() {
  let open!: () => void;
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { open, wait: () => opened };
}

function patch(body: unknown): ChangeRequest[] {
  return [{ method: 'PATCH', path: `/api/v1/cards/${cardId}`, body }];
}

function toastText() {
  return screen.getByRole('status').textContent;
}

const savedStamp = '2026-10-21T12:00:00.000Z';

// The card as loaded, then as the settle refetch reads it once a save finished.
function cardThenSaved(overrides: Partial<Card> = {}): Reply {
  let loads = 0;
  return () =>
    HttpResponse.json(
      cardFixture(cardId, backlog.id, {
        ...overrides,
        updatedAt: loads++ === 0 ? stamp : savedStamp,
      }),
    );
}

async function expectSavedSilently(
  result: Awaited<ReturnType<typeof setupReady>>['result'],
) {
  await waitFor(() =>
    expect(result.current.state.card?.updatedAt).toBe(savedStamp),
  );
  // The save resolves in microtasks after the refetch lands; one macrotask runs them all.
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
  expect(toastText()).toBe('');
}

function toastButtons() {
  return ['Recarregar', 'Tentar novamente'].filter(
    (name) => screen.queryByRole('button', { name }) !== null,
  );
}

const saveFail = 'Não foi possível salvar. Tente novamente.';
const conflict = 'Este item foi arquivado. Recarregue para ver o estado atual.';
const titleFieldError = [{ field: 'title', message: 'too long' }];

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('useCardDetailViewModel', () => {
  describe('load status', () => {
    it('is ready with the card once every query loaded', async () => {
      detailServer();
      const { result } = await setupReady();

      expect(result.current.state.card?.id).toBe(cardId);
    });

    it.each([cardUrl, boardUrl, listsUrl, archivedListsUrl, labelsUrl])(
      'is loading while %s is pending',
      async (url) => {
        let release: () => void = () => undefined;
        const gate = new Promise<undefined>((resolve) => {
          release = () => resolve(undefined);
        });
        const requests = detailServer({ [url]: () => gate });
        const { result } = setup();

        // Every other query has answered; only the gated one is still out.
        await waitFor(() =>
          expect(Object.keys(requests).sort()).toEqual(
            [cardUrl, boardUrl, listsUrl, archivedListsUrl, labelsUrl].sort(),
          ),
        );
        expect(result.current.state.status).toBe('loading');

        release();
        await waitFor(() => expect(result.current.state.status).toBe('ready'));
      },
    );

    it.each([cardUrl, boardUrl])(
      'is notFound when %s answers 404',
      async (url) => {
        detailServer({ [url]: () => problem(404) });
        const { result } = setup();

        await waitFor(() =>
          expect(result.current.state.status).toBe('notFound'),
        );
      },
    );

    it('is notFound when the card belongs to a list of another board', async () => {
      detailServer({
        [cardUrl]: () => HttpResponse.json(cardFixture(cardId, 'l-other')),
      });
      const { result } = setup();

      await waitFor(() => expect(result.current.state.status).toBe('notFound'));
    });

    it('is error when a query keeps failing with 500', async () => {
      detailServer({ [cardUrl]: () => problem(500) });
      const { result } = setup();

      await waitFor(() => expect(result.current.state.status).toBe('error'));
    });

    it('retryLoad refetches only the failed queries and turns ready', async () => {
      let failing = true;
      const requests = detailServer({
        [archivedListsUrl]: () => (failing ? problem(500) : undefined),
      });
      const { result } = setup();
      await waitFor(() => expect(result.current.state.status).toBe('error'));
      const before = { ...requests };

      failing = false;
      act(() => result.current.actions.retryLoad());

      await waitFor(() => expect(result.current.state.status).toBe('ready'));
      expect(requests[archivedListsUrl]).toBe(before[archivedListsUrl] + 1);
      expect(requests[cardUrl]).toBe(before[cardUrl]);
      expect(requests[boardUrl]).toBe(before[boardUrl]);
      expect(requests[listsUrl]).toBe(before[listsUrl]);
      expect(requests[labelsUrl]).toBe(before[labelsUrl]);
    });
  });

  describe('mode', () => {
    it('is editable for an active card of an active board', async () => {
      detailServer();
      const { result } = await setupReady();

      expect(result.current.state.mode).toBe('editable');
    });

    it('is archivedCard for an archived card of an active board', async () => {
      detailServer({
        [cardUrl]: () =>
          HttpResponse.json(
            cardFixture(cardId, backlog.id, { archivedAt: stamp }),
          ),
      });
      const { result } = await setupReady();

      expect(result.current.state.mode).toBe('archivedCard');
    });

    it('is archivedBoard when the board is archived, even for an archived card', async () => {
      detailServer({
        [boardUrl]: () =>
          HttpResponse.json(boardFixture({ archivedAt: stamp })),
        [cardUrl]: () =>
          HttpResponse.json(
            cardFixture(cardId, backlog.id, { archivedAt: stamp }),
          ),
      });
      const { result } = await setupReady();

      expect(result.current.state.mode).toBe('archivedBoard');
    });
  });

  describe('column', () => {
    it('resolves an active column', async () => {
      detailServer();
      const { result } = await setupReady();

      expect(result.current.state.list?.title).toBe('Backlog');
      expect(result.current.state.isColumnArchived).toBe(false);
    });

    it('resolves an archived column', async () => {
      detailServer({
        [cardUrl]: () =>
          HttpResponse.json(
            cardFixture(cardId, ideas.id, { archivedAt: stamp }),
          ),
      });
      const { result } = await setupReady();

      expect(result.current.state.list?.title).toBe('Ideas');
      expect(result.current.state.isColumnArchived).toBe(true);
    });

    it('lists only the active columns as move targets', async () => {
      detailServer();
      const { result } = await setupReady();

      expect(result.current.state.activeLists.map((l) => l.id)).toEqual([
        backlog.id,
        doing.id,
      ]);
    });
  });

  describe('labels', () => {
    it('follows the board label order and skips unknown ids', async () => {
      detailServer({
        [cardUrl]: () =>
          HttpResponse.json(
            cardFixture(cardId, backlog.id, {
              labelIds: [bug.id, 'lb-gone', urgent.id],
            }),
          ),
      });
      const { result } = await setupReady();

      expect(result.current.state.labels.map((l) => l.name)).toEqual([
        'Urgent',
        'Bug',
      ]);
    });
  });

  describe('done and due date', () => {
    it.each([false, true])(
      'toggleDone on a card with done %s shows the flip at once, sends it and saves silently',
      async (done) => {
        detailServer({ [cardUrl]: cardThenSaved({ done }) });
        const held = gate();
        const changes = cardWrites(async () => {
          await held.wait();
          return HttpResponse.json(cardFixture(cardId, backlog.id));
        });
        const { result } = await setupReady();

        act(() => result.current.actions.toggleDone());

        await waitFor(() =>
          expect(result.current.state.card?.done).toBe(!done),
        );
        held.open();
        await expectSavedSilently(result);
        expect(changes).toEqual(patch({ done: !done }));
      },
    );

    it('setDueDate shows the date at once, sends it and saves silently', async () => {
      detailServer({ [cardUrl]: cardThenSaved() });
      const held = gate();
      const changes = cardWrites(async () => {
        await held.wait();
        return HttpResponse.json(cardFixture(cardId, backlog.id));
      });
      const { result } = await setupReady();

      act(() => result.current.actions.setDueDate('2026-11-05'));

      await waitFor(() =>
        expect(result.current.state.card?.dueDate).toBe('2026-11-05'),
      );
      held.open();
      await expectSavedSilently(result);
      expect(changes).toEqual(patch({ dueDate: '2026-11-05' }));
    });

    it('removeDueDate clears the date at once, sends null and saves silently', async () => {
      detailServer({ [cardUrl]: cardThenSaved({ dueDate: '2026-11-05' }) });
      const held = gate();
      const changes = cardWrites(async () => {
        await held.wait();
        return HttpResponse.json(cardFixture(cardId, backlog.id));
      });
      const { result } = await setupReady();

      act(() => result.current.actions.removeDueDate());

      await waitFor(() =>
        expect(result.current.state.card?.dueDate).toBeNull(),
      );
      held.open();
      await expectSavedSilently(result);
      expect(changes).toEqual(patch({ dueDate: null }));
    });
  });

  describe('title', () => {
    it('submitTitle shows the trimmed title at once, sends it and saves silently', async () => {
      detailServer({ [cardUrl]: cardThenSaved() });
      const held = gate();
      const changes = cardWrites(async () => {
        await held.wait();
        return HttpResponse.json(cardFixture(cardId, backlog.id));
      });
      const { result } = await setupReady();

      act(() => result.current.actions.setTitleDraft('  Write tests  '));
      expect(result.current.state.titleDraft).toBe('  Write tests  ');
      act(() => result.current.actions.submitTitle());

      expect(result.current.state.titleDraft).toBeNull();
      await waitFor(() =>
        expect(result.current.state.card?.title).toBe('Write tests'),
      );
      held.open();
      await expectSavedSilently(result);
      expect(changes).toEqual(patch({ title: 'Write tests' }));
    });

    it('submitTitle with the saved title after trimming sends nothing', async () => {
      detailServer();
      const changes = cardWrites();
      const { result } = await setupReady();

      act(() => result.current.actions.setTitleDraft(`  Card ${cardId} `));
      act(() => result.current.actions.submitTitle());

      expect(result.current.state.titleDraft).toBeNull();
      expect(result.current.state.titleError).toBeNull();
      expect(changes).toEqual([]);
    });

    it('submitTitle saves a 100-character title', async () => {
      detailServer();
      const changes = cardWrites();
      const { result } = await setupReady();
      const title = 'a'.repeat(100);

      act(() => result.current.actions.setTitleDraft(` ${title} `));
      act(() => result.current.actions.submitTitle());

      expect(result.current.state.titleError).toBeNull();
      await waitFor(() => expect(changes).toEqual(patch({ title })));
    });

    it.each([
      ['   ', 'cardTitleRequired'],
      ['a'.repeat(101), 'cardTitleTooLong'],
    ])(
      'submitTitle with %j sets %s, keeps the draft and sends nothing',
      async (draft, error) => {
        detailServer();
        const changes = cardWrites();
        const { result } = await setupReady();

        act(() => result.current.actions.setTitleDraft(draft));
        act(() => result.current.actions.submitTitle());

        expect(result.current.state.titleError).toBe(error);
        expect(result.current.state.titleDraft).toBe(draft);
        expect(changes).toEqual([]);
      },
    );

    it('cancelTitle restores the saved title and clears the error', async () => {
      detailServer();
      const { result } = await setupReady();
      act(() => result.current.actions.setTitleDraft(''));
      act(() => result.current.actions.submitTitle());

      act(() => result.current.actions.cancelTitle());

      expect(result.current.state.titleDraft).toBeNull();
      expect(result.current.state.titleError).toBeNull();
      expect(result.current.state.card?.title).toBe(`Card ${cardId}`);
    });

    it('a failed title save puts the title back and keeps the typed text as a draft', async () => {
      detailServer();
      cardWrites(() => problem(500));
      const { result } = await setupReady();

      act(() => result.current.actions.setTitleDraft(' Write tests '));
      act(() => result.current.actions.submitTitle());

      await screen.findByText(saveFail);
      expect(result.current.state.titleDraft).toBe(' Write tests ');
      expect(result.current.state.card?.title).toBe(`Card ${cardId}`);
      expect(result.current.state.isDirty).toBe(true);
    });

    it('a title 400 becomes the field error with no toast', async () => {
      detailServer();
      cardWrites(() => problem(400, titleFieldError));
      const { result } = await setupReady();

      act(() => result.current.actions.setTitleDraft('Write tests'));
      act(() => result.current.actions.submitTitle());

      await waitFor(() =>
        expect(result.current.state.titleError).toBe('cardTitleTooLong'),
      );
      expect(result.current.state.titleDraft).toBe('Write tests');
      expect(toastText()).toBe('');
    });

    it('the title retry resends the same title', async () => {
      detailServer();
      const changes = cardWrites(() => problem(500));
      const { result } = await setupReady();
      act(() => result.current.actions.setTitleDraft(' Write tests '));
      act(() => result.current.actions.submitTitle());
      await screen.findByText(saveFail);

      act(() =>
        screen.getByRole('button', { name: 'Tentar novamente' }).click(),
      );

      await waitFor(() =>
        expect(changes).toEqual([
          ...patch({ title: 'Write tests' }),
          ...patch({ title: 'Write tests' }),
        ]),
      );
    });
  });

  describe('description', () => {
    it('saveDescription sends the untrimmed draft, clears it and saves silently', async () => {
      detailServer({ [cardUrl]: cardThenSaved() });
      const changes = cardWrites();
      const { result } = await setupReady();

      act(() => result.current.actions.setDescriptionDraft(' Notes '));
      expect(result.current.state.descriptionDraft).toBe(' Notes ');
      act(() => result.current.actions.saveDescription());

      expect(result.current.state.descriptionDraft).toBeNull();
      await expectSavedSilently(result);
      expect(changes).toEqual(patch({ description: ' Notes ' }));
    });

    it('saveDescription sends null for an empty draft', async () => {
      detailServer({
        [cardUrl]: () =>
          HttpResponse.json(
            cardFixture(cardId, backlog.id, { description: 'Old' }),
          ),
      });
      const changes = cardWrites();
      const { result } = await setupReady();

      act(() => result.current.actions.setDescriptionDraft(''));
      act(() => result.current.actions.saveDescription());

      await waitFor(() =>
        expect(changes).toEqual(patch({ description: null })),
      );
    });

    it('allows and saves a 5000-character description', async () => {
      detailServer();
      const changes = cardWrites();
      const { result } = await setupReady();
      const description = 'a'.repeat(5000);

      act(() => result.current.actions.setDescriptionDraft(description));
      expect(result.current.state.descriptionError).toBeNull();
      act(() => result.current.actions.saveDescription());

      await waitFor(() => expect(changes).toEqual(patch({ description })));
    });

    it('a 5001-character draft sets the error and saveDescription sends nothing', async () => {
      detailServer();
      const changes = cardWrites();
      const { result } = await setupReady();
      const draft = 'a'.repeat(5001);

      act(() => result.current.actions.setDescriptionDraft(draft));
      expect(result.current.state.descriptionError).toBe(
        'cardDescriptionTooLong',
      );
      act(() => result.current.actions.saveDescription());

      expect(result.current.state.descriptionDraft).toBe(draft);
      expect(changes).toEqual([]);
    });

    it('cancelDescription restores the saved description', async () => {
      detailServer();
      const { result } = await setupReady();
      act(() => result.current.actions.setDescriptionDraft('a'.repeat(5001)));

      act(() => result.current.actions.cancelDescription());

      expect(result.current.state.descriptionDraft).toBeNull();
      expect(result.current.state.descriptionError).toBeNull();
      expect(result.current.state.isDirty).toBe(false);
    });

    it('a failed description save keeps the typed text as a draft', async () => {
      detailServer();
      cardWrites(() => problem(500));
      const { result } = await setupReady();

      act(() => result.current.actions.setDescriptionDraft('Notes'));
      act(() => result.current.actions.saveDescription());

      await screen.findByText(saveFail);
      expect(result.current.state.descriptionDraft).toBe('Notes');
      expect(result.current.state.card?.description).toBeNull();
      expect(result.current.state.isDirty).toBe(true);
    });
  });

  describe('save failures', () => {
    it.each([
      [500, saveFail, ['Tentar novamente']],
      [409, conflict, ['Recarregar']],
    ])(
      'a save failing with %i puts the card back and toasts %j',
      async (status, message, buttons) => {
        detailServer();
        cardWrites(() => problem(status));
        const { result } = await setupReady();

        act(() => result.current.actions.toggleDone());

        await screen.findByText(message);
        await waitFor(() =>
          expect(result.current.state.card?.done).toBe(false),
        );
        expect(toastButtons()).toEqual(buttons);
      },
    );

    it('a save failing with 404 toasts and refetches the card into notFound', async () => {
      let deleted = false;
      detailServer({ [cardUrl]: () => (deleted ? problem(404) : undefined) });
      cardWrites(() => {
        deleted = true;
        return problem(404);
      });
      const { result } = await setupReady();

      act(() => result.current.actions.toggleDone());

      await screen.findByText(saveFail);
      expect(toastButtons()).toEqual([]);
      await waitFor(() => expect(result.current.state.status).toBe('notFound'));
    });
  });

  describe('isDirty', () => {
    it('is false with no drafts', async () => {
      detailServer();
      const { result } = await setupReady();

      expect(result.current.state.isDirty).toBe(false);
    });

    it('is true while the trimmed title draft differs and false after cancelTitle', async () => {
      detailServer();
      const { result } = await setupReady();

      act(() => result.current.actions.setTitleDraft(` Card ${cardId} `));
      expect(result.current.state.isDirty).toBe(false);
      act(() => result.current.actions.setTitleDraft('Other'));
      expect(result.current.state.isDirty).toBe(true);

      act(() => result.current.actions.cancelTitle());
      expect(result.current.state.isDirty).toBe(false);
    });

    it('is true while the description draft differs from the saved one', async () => {
      detailServer();
      const { result } = await setupReady();

      act(() => result.current.actions.setDescriptionDraft(''));
      expect(result.current.state.isDirty).toBe(false);
      act(() => result.current.actions.setDescriptionDraft('Notes'));
      expect(result.current.state.isDirty).toBe(true);
    });
  });

  it('treats the local calendar date as today', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 1, 23, 30));
    detailServer();
    const { result } = setup();

    expect(result.current.state.today).toEqual({
      year: 2026,
      month: 11,
      day: 1,
    });
  });
});
