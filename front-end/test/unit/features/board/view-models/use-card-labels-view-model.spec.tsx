import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import {
  act,
  cleanup,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { boardViewKeys } from '@/features/board/api/keys';
import type { Card, Label } from '@/features/board/model/types';
import { useCardLabelsViewModel } from '@/features/board/view-models/use-card-labels-view-model';
import { ApiProvider } from '@/shared/api/api-context';
import { createApiClient } from '@/shared/api/client';
import { createQueryClient } from '@/shared/api/query-client';
import { createI18n } from '@/shared/i18n/i18n';
import { ToastProvider } from '@/shared/ui/toast/toast-provider';

import {
  boardId,
  cardFixture,
  labelFixture,
} from '../../../../support/fixtures/board';
import { server } from '../../../../support/msw/server';

afterEach(cleanup);

const baseUrl = 'http://api.test';
const toggleUrl = `${baseUrl}/api/v1/cards/:id/labels/:labelId`;
const saveFail = 'Não foi possível salvar. Tente novamente.';
const conflict = 'Este item foi arquivado. Recarregue para ver o estado atual.';

const labels: Label[] = [
  labelFixture('l1', { name: 'Bug' }),
  labelFixture('l2', { name: 'Urgent' }),
  labelFixture('l3', { name: 'Docs' }),
];

function problem(status: number) {
  return HttpResponse.json(
    { type: `/problems/${status}`, title: 'Error', status, detail: '' },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}

// Records each toggle request; answers with the next queued reply, or 204.
function toggleServer(...replies: (() => Response | Promise<Response>)[]) {
  const requests: { method: string; labelId: string }[] = [];
  server.use(
    http.all(toggleUrl, ({ request, params }) => {
      requests.push({
        method: request.method,
        labelId: String(params.labelId),
      });
      return (
        replies.shift() ?? (() => new HttpResponse(null, { status: 204 }))
      )();
    }),
  );
  return requests;
}

function setup(card: Card | undefined, boardLabels: Label[] = labels) {
  const api = createApiClient({
    baseUrl,
    getToken: () => 'token-123',
    onSessionExpired: vi.fn<() => void>(),
  });
  const queryClient = createQueryClient();
  queryClient.setQueryData(boardViewKeys.labels(boardId), boardLabels);
  if (card)
    queryClient.setQueryData(boardViewKeys.card(boardId, card.id), card);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <I18nextProvider i18n={createI18n('pt-BR')}>
      <QueryClientProvider client={queryClient}>
        <ApiProvider client={api}>
          <ToastProvider>{children}</ToastProvider>
        </ApiProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
  // Subscribes to the card cache like the detail screen does, so the
  // optimistic patch reaches the hook.
  const rendered = renderHook(
    () => {
      const cached = useQuery<Card | undefined>({
        queryKey: boardViewKeys.card(boardId, card?.id ?? ''),
        queryFn: () => card,
        enabled: false,
      });
      return useCardLabelsViewModel(boardId, cached.data, boardLabels);
    },
    { wrapper },
  );
  return { ...rendered, queryClient };
}

function checkedIds(result: ReturnType<typeof setup>['result']): string[] {
  return result.current.state.options
    .filter((option) => option.isChecked)
    .map((option) => option.label.id);
}

describe('useCardLabelsViewModel', () => {
  describe('opening', () => {
    it('starts closed with an empty query', () => {
      const { result } = setup(cardFixture('c1', 'list-1'));

      expect(result.current.state.isOpen).toBe(false);
      expect(result.current.state.query).toBe('');
    });

    it('opens and closes through setOpen', () => {
      const { result } = setup(cardFixture('c1', 'list-1'));

      act(() => result.current.actions.setOpen(true));
      expect(result.current.state.isOpen).toBe(true);

      act(() => result.current.actions.setOpen(false));
      expect(result.current.state.isOpen).toBe(false);
    });

    it('clears the query on close so the next open lists every label', () => {
      const { result } = setup(cardFixture('c1', 'list-1'));
      act(() => result.current.actions.setOpen(true));
      act(() => result.current.actions.setQuery('ur'));
      expect(result.current.state.options).toHaveLength(1);

      act(() => result.current.actions.setOpen(false));
      act(() => result.current.actions.setOpen(true));

      expect(result.current.state.query).toBe('');
      expect(result.current.state.options).toHaveLength(3);
    });
  });

  describe('options', () => {
    it('lists every board label in order, checked only for the card label ids', () => {
      const card = cardFixture('c1', 'list-1', { labelIds: ['l3', 'l1'] });
      const { result } = setup(card);

      expect(result.current.state.options.map((o) => o.label.id)).toEqual([
        'l1',
        'l2',
        'l3',
      ]);
      expect(checkedIds(result)).toEqual(['l1', 'l3']);
    });

    it('leaves every option unchecked when the card is not loaded', () => {
      const { result } = setup(undefined);

      expect(result.current.state.options).toHaveLength(3);
      expect(checkedIds(result)).toEqual([]);
    });

    it('is empty for a board with no labels', () => {
      const { result } = setup(cardFixture('c1', 'list-1'), []);

      expect(result.current.state.options).toEqual([]);
    });
  });

  describe('search', () => {
    it('keeps only the labels that match the query', () => {
      const card = cardFixture('c1', 'list-1', { labelIds: ['l2'] });
      const { result } = setup(card);

      act(() => result.current.actions.setQuery('ur'));

      expect(result.current.state.query).toBe('ur');
      expect(result.current.state.options).toEqual([
        { label: labels[1], isChecked: true, isPending: false },
      ]);
    });

    it('returns no options when nothing matches', () => {
      const { result } = setup(cardFixture('c1', 'list-1'));

      act(() => result.current.actions.setQuery('zzz'));

      expect(result.current.state.options).toEqual([]);
    });
  });
});

describe('useCardLabelsViewModel — apply and remove', () => {
  const card = cardFixture('c1', 'list-1', { labelIds: ['l2'] });

  it('applies an unchecked label with a PUT, no toast, popover still open', async () => {
    const requests = toggleServer();
    const { result } = setup(card);
    act(() => result.current.actions.setOpen(true));

    act(() => result.current.actions.toggle(labels[0]));

    await waitFor(() =>
      expect(requests).toEqual([{ method: 'PUT', labelId: 'l1' }]),
    );
    await waitFor(() => expect(checkedIds(result)).toEqual(['l1', 'l2']));
    expect(screen.queryByText(saveFail)).toBeNull();
    expect(result.current.state.isOpen).toBe(true);
  });

  it('removes a checked label with a DELETE', async () => {
    const requests = toggleServer();
    const { result } = setup(card);

    act(() => result.current.actions.toggle(labels[1]));

    await waitFor(() =>
      expect(requests).toEqual([{ method: 'DELETE', labelId: 'l2' }]),
    );
    await waitFor(() => expect(checkedIds(result)).toEqual([]));
  });

  it('marks only the toggled option as pending while in flight', async () => {
    let open!: () => void;
    const held = new Promise<void>((resolve) => (open = resolve));
    toggleServer(async () => {
      await held;
      return new HttpResponse(null, { status: 204 });
    });
    const { result } = setup(card);

    act(() => result.current.actions.toggle(labels[0]));

    await waitFor(() =>
      expect(
        result.current.state.options
          .filter((o) => o.isPending)
          .map((o) => o.label.id),
      ).toEqual(['l1']),
    );
    open();
    await waitFor(() =>
      expect(result.current.state.options.some((o) => o.isPending)).toBe(false),
    );
  });

  it('a 5xx shows the save-fail toast and Tentar novamente repeats the request', async () => {
    const requests = toggleServer(() => problem(500));
    const { result } = setup(card);

    act(() => result.current.actions.toggle(labels[0]));

    await screen.findByText(saveFail);
    await waitFor(() => expect(checkedIds(result)).toEqual(['l2']));
    act(() => screen.getByRole('button', { name: 'Tentar novamente' }).click());

    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1]).toEqual({ method: 'PUT', labelId: 'l1' });
  });

  it('a 409 shows the conflict toast and Recarregar refetches the board view', async () => {
    toggleServer(() => problem(409));
    const { result, queryClient } = setup(card);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    act(() => result.current.actions.toggle(labels[0]));

    await screen.findByText(conflict);
    invalidate.mockClear();
    act(() => screen.getByRole('button', { name: 'Recarregar' }).click());

    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: boardViewKeys.all(boardId),
    });
  });

  it('a 404 shows the save-fail toast, no retry, and refetches the board view', async () => {
    toggleServer(() => problem(404));
    const { result, queryClient } = setup(card);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    act(() => result.current.actions.toggle(labels[0]));

    await screen.findByText(saveFail);
    expect(
      screen.queryByRole('button', { name: 'Tentar novamente' }),
    ).toBeNull();
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: boardViewKeys.all(boardId),
    });
  });
});

describe('useCardLabelsViewModel — create form', () => {
  const card = cardFixture('c1', 'list-1');

  it('has no form until startCreate', () => {
    const { result } = setup(card);

    expect(result.current.state.form).toBeNull();
  });

  it('startCreate opens the form with the search text as name and blue as color', () => {
    const { result } = setup(card);
    act(() => result.current.actions.setOpen(true));
    act(() => result.current.actions.setQuery('Errands'));

    act(() => result.current.actions.startCreate());

    expect(result.current.state.form).toEqual({
      name: 'Errands',
      color: 'blue',
      error: null,
    });
  });

  it('setName and setColor update the form and keep the error empty', () => {
    const { result } = setup(card);
    act(() => result.current.actions.startCreate());

    act(() => result.current.actions.setName('Errands'));
    act(() => result.current.actions.setColor('orange'));

    expect(result.current.state.form).toEqual({
      name: 'Errands',
      color: 'orange',
      error: null,
    });
  });

  it('cancelCreate drops the form without sending a request', () => {
    const requests: string[] = [];
    server.use(
      http.all(`${baseUrl}/*`, ({ request }) => {
        requests.push(request.method);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { result } = setup(card);
    act(() => result.current.actions.startCreate());
    act(() => result.current.actions.setName('Errands'));
    act(() => result.current.actions.setColor('red'));

    act(() => result.current.actions.cancelCreate());

    expect(result.current.state.form).toBeNull();
    expect(requests).toEqual([]);
  });

  it('startCreate after a cancel starts again from the search text and blue', () => {
    const { result } = setup(card);
    act(() => result.current.actions.setQuery('Docs2'));
    act(() => result.current.actions.startCreate());
    act(() => result.current.actions.setColor('red'));
    act(() => result.current.actions.cancelCreate());

    act(() => result.current.actions.startCreate());

    expect(result.current.state.form).toEqual({
      name: 'Docs2',
      color: 'blue',
      error: null,
    });
  });

  it('setOpen(false) drops the form together with the query', () => {
    const { result } = setup(card);
    act(() => result.current.actions.setOpen(true));
    act(() => result.current.actions.setQuery('Errands'));
    act(() => result.current.actions.startCreate());

    act(() => result.current.actions.setOpen(false));

    expect(result.current.state.form).toBeNull();
    expect(result.current.state.query).toBe('');
  });
});

describe('useCardLabelsViewModel — submit create', () => {
  const card = cardFixture('c1', 'list-1');
  const createUrl = `${baseUrl}/api/v1/boards/:boardId/labels`;
  const created = 'Etiqueta criada';
  const newLabel = labelFixture('l9', { name: 'Errands', color: 'orange' });

  function problemOfType(status: number, type: string) {
    return HttpResponse.json(
      { type, title: 'Error', status, detail: '' },
      { status, headers: { 'Content-Type': 'application/problem+json' } },
    );
  }

  // Records each create body; answers with the next queued reply, or 201.
  function createServer(...replies: (() => Response | Promise<Response>)[]) {
    const bodies: unknown[] = [];
    server.use(
      http.post(createUrl, async ({ request }) => {
        bodies.push(await request.json());
        return (
          replies.shift() ??
          (() => HttpResponse.json(newLabel, { status: 201 }))
        )();
      }),
    );
    return bodies;
  }

  function fill(
    result: ReturnType<typeof setup>['result'],
    name: string,
    color: Label['color'] = 'orange',
  ) {
    act(() => result.current.actions.setOpen(true));
    act(() => result.current.actions.startCreate());
    act(() => result.current.actions.setName(name));
    act(() => result.current.actions.setColor(color));
  }

  it('sends the trimmed name and the color', async () => {
    const bodies = createServer();
    toggleServer();
    const { result } = setup(card);
    fill(result, '  Errands  ');

    act(() => result.current.actions.submitCreate());

    await waitFor(() =>
      expect(bodies).toEqual([{ name: 'Errands', color: 'orange' }]),
    );
  });

  it('a second submit in flight sends nothing and isCreating is true meanwhile', async () => {
    let open!: () => void;
    const held = new Promise<void>((resolve) => (open = resolve));
    const bodies = createServer(async () => {
      await held;
      return HttpResponse.json(newLabel, { status: 201 });
    });
    toggleServer();
    const { result } = setup(card);
    fill(result, 'Errands');

    act(() => result.current.actions.submitCreate());
    act(() => result.current.actions.submitCreate());

    await waitFor(() => expect(result.current.state.isCreating).toBe(true));
    open();
    await waitFor(() => expect(result.current.state.isCreating).toBe(false));
    expect(bodies).toHaveLength(1);
  });

  it('201 closes the form, clears the query, toasts and applies the new label', async () => {
    createServer();
    const requests = toggleServer();
    const { result } = setup(card);
    fill(result, 'Errands');
    act(() => result.current.actions.setQuery('Err'));

    act(() => result.current.actions.submitCreate());

    await screen.findByText(created);
    expect(result.current.state.form).toBeNull();
    expect(result.current.state.query).toBe('');
    await waitFor(() =>
      expect(requests).toEqual([{ method: 'PUT', labelId: 'l9' }]),
    );
  });

  it.each([
    ['empty', '   ', 'labelNameRequired'],
    ['51 chars', 'a'.repeat(51), 'labelNameTooLong'],
    ['clashing', 'bug', 'labelNameTaken'],
  ])('%s name sets the error and sends nothing', (_case, name, error) => {
    const bodies = createServer();
    const { result } = setup(card);
    fill(result, name);

    act(() => result.current.actions.submitCreate());

    expect(result.current.state.form?.error).toBe(error);
    expect(result.current.state.form?.name).toBe(name);
    expect(bodies).toEqual([]);
    expect(result.current.state.isCreating).toBe(false);
  });

  it('a 50 char name is sent', async () => {
    const name = 'a'.repeat(50);
    const bodies = createServer();
    toggleServer();
    const { result } = setup(card);
    fill(result, name);

    act(() => result.current.actions.submitCreate());

    await waitFor(() => expect(bodies).toEqual([{ name, color: 'orange' }]));
  });

  it('a 409 label-name-taken sets the error, keeps the form text and refetches the labels', async () => {
    createServer(() => problemOfType(409, '/problems/label-name-taken'));
    const { result, queryClient } = setup(card);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    fill(result, 'Errands');

    act(() => result.current.actions.submitCreate());

    await waitFor(() =>
      expect(result.current.state.form).toEqual({
        name: 'Errands',
        color: 'orange',
        error: 'labelNameTaken',
      }),
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: boardViewKeys.labels(boardId),
    });
    expect(screen.queryByText(saveFail)).toBeNull();
  });

  it('a 409 board-archived shows the conflict toast with Recarregar and keeps the form', async () => {
    createServer(() => problemOfType(409, '/problems/board-archived'));
    const { result, queryClient } = setup(card);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    fill(result, 'Errands');

    act(() => result.current.actions.submitCreate());

    await screen.findByText(conflict);
    expect(result.current.state.form?.name).toBe('Errands');
    invalidate.mockClear();
    act(() => screen.getByRole('button', { name: 'Recarregar' }).click());
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: boardViewKeys.all(boardId),
    });
  });

  it('a 5xx keeps the form and Tentar novamente resends the same body', async () => {
    const bodies = createServer(() => problem(500));
    toggleServer();
    const { result } = setup(card);
    fill(result, 'Errands');

    act(() => result.current.actions.submitCreate());

    await screen.findByText(saveFail);
    expect(result.current.state.form?.name).toBe('Errands');
    act(() => screen.getByRole('button', { name: 'Tentar novamente' }).click());

    await waitFor(() => expect(bodies).toHaveLength(2));
    expect(bodies[1]).toEqual({ name: 'Errands', color: 'orange' });
  });

  it('create ok then PUT 5xx leaves the label unchecked and shows both toasts', async () => {
    createServer();
    toggleServer(() => problem(500));
    const { result, queryClient } = setup(card);
    fill(result, 'Errands');

    act(() => result.current.actions.submitCreate());

    await screen.findByText(created);
    await screen.findByText(saveFail);
    expect(
      queryClient.getQueryData<Label[]>(boardViewKeys.labels(boardId)),
    ).toContainEqual(newLabel);
    expect(
      queryClient.getQueryData<Card>(boardViewKeys.card(boardId, 'c1'))
        ?.labelIds,
    ).toEqual([]);
  });
});
