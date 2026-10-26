import type { Board } from '@my-trello/api-contract';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { BoardFormValues } from '@/features/boards/model/types';
import { useBoardsViewModel } from '@/features/boards/view-models/use-boards-view-model';
import { ApiProvider } from '@/shared/api/api-context';
import { createApiClient } from '@/shared/api/client';
import { createQueryClient } from '@/shared/api/query-client';
import { createI18n } from '@/shared/i18n/i18n';
import { ToastProvider } from '@/shared/ui/toast/toast-provider';

import { server } from '../../../../support/msw/server';

const baseUrl = 'http://api.test';
const boardsUrl = `${baseUrl}/api/v1/boards`;

const roadmap: Board = {
  id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  title: 'Roadmap',
  description: 'Q4 plans',
  archivedAt: null,
  createdAt: '2026-10-23T12:00:00.000Z',
  updatedAt: '2026-10-23T12:00:00.000Z',
};
const oldPlans: Board = {
  ...roadmap,
  id: '9b2d4a1e-3c5f-4e8a-9d7b-1f6e2c8a4b3d',
  title: 'Old plans',
  archivedAt: '2026-10-24T12:00:00.000Z',
};

const travel: Board = {
  ...roadmap,
  id: '3f1c2b7a-8d4e-4b6f-a5c9-2e7d1a0b9c8f',
  title: 'Travel',
};

const values: BoardFormValues = { name: '  Roadmap ', description: '' };

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

// Answers the active and archived lists apart, so a test can see which one was requested.
function listsHandler() {
  return http.get(boardsUrl, ({ request }) =>
    HttpResponse.json(
      new URL(request.url).searchParams.get('archived') === 'true'
        ? [oldPlans]
        : [roadmap],
    ),
  );
}

function setup(route = '/boards') {
  const onCreated = vi.fn<(id: string) => void>();
  const onSessionExpired = vi.fn<() => void>();
  const api = createApiClient({
    baseUrl,
    getToken: () => 'token-123',
    onSessionExpired,
  });
  const queryClient = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[route]}>
      <I18nextProvider i18n={createI18n('pt-BR')}>
        <QueryClientProvider client={queryClient}>
          <ApiProvider client={api}>
            <ToastProvider>{children}</ToastProvider>
          </ApiProvider>
        </QueryClientProvider>
      </I18nextProvider>
    </MemoryRouter>
  );
  const { result } = renderHook(
    () => ({
      vm: useBoardsViewModel({ onCreated }),
      location: useLocation(),
    }),
    { wrapper },
  );
  return { result, onCreated, onSessionExpired };
}

// Records every create body, answering each with the next queued response.
function createHandler(...responses: (() => Response)[]) {
  const bodies: unknown[] = [];
  server.use(
    http.post(boardsUrl, async ({ request }) => {
      bodies.push(await request.json());
      const next = responses.shift() ?? (() => HttpResponse.json(roadmap));
      return next();
    }),
  );
  return bodies;
}

type ChangeRequest = { method: string; path: string; body: unknown };

// Serves both lists from `lists`, counts each list fetch and records every change request.
// Each change is answered by the next queued response, or by a success one.
function boardsServer(...responses: (() => Response | Promise<Response>)[]) {
  const lists = { active: [roadmap, travel], archived: [oldPlans] };
  const fetches = { active: 0, archived: 0 };
  const changes: ChangeRequest[] = [];
  async function answer(request: Request, success: () => Response) {
    const path = new URL(request.url).pathname;
    const text = await request.text();
    changes.push({
      method: request.method,
      path,
      body: text ? JSON.parse(text) : undefined,
    });
    return (responses.shift() ?? success)();
  }
  server.use(
    http.get(boardsUrl, ({ request }) => {
      const tab =
        new URL(request.url).searchParams.get('archived') === 'true'
          ? 'archived'
          : 'active';
      fetches[tab] += 1;
      return HttpResponse.json(lists[tab]);
    }),
    http.patch(`${boardsUrl}/:id`, ({ request }) =>
      answer(request, () => HttpResponse.json(roadmap)),
    ),
    http.post(`${boardsUrl}/:id/archive`, ({ request }) =>
      answer(request, () => HttpResponse.json(roadmap)),
    ),
    http.post(`${boardsUrl}/:id/unarchive`, ({ request }) =>
      answer(request, () => HttpResponse.json(oldPlans)),
    ),
    http.delete(`${boardsUrl}/:id`, ({ request }) =>
      answer(request, () => new HttpResponse(null, { status: 204 })),
    ),
  );
  return { lists, fetches, changes };
}

// Holds a response until `open()`, so a test can look at the screen mid-request.
function gate() {
  let open!: () => void;
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { open, wait: () => opened };
}

const saveFail = 'Não foi possível salvar. Tente novamente.';
const conflict = 'Este item foi arquivado. Recarregue para ver o estado atual.';

describe('useBoardsViewModel', () => {
  afterEach(cleanup);

  describe('tabs', () => {
    it('selects Ativos and loads the active list on /boards', async () => {
      server.use(listsHandler());
      const { result } = setup('/boards');

      expect(result.current.vm.state.tab).toBe('active');
      await waitFor(() =>
        expect(result.current.vm.state.query.data).toEqual([roadmap]),
      );
    });

    it('selects Arquivados and loads the archived list on ?archived=true', async () => {
      server.use(listsHandler());
      const { result } = setup('/boards?archived=true');

      expect(result.current.vm.state.tab).toBe('archived');
      await waitFor(() =>
        expect(result.current.vm.state.query.data).toEqual([oldPlans]),
      );
    });

    it('treats any other ?archived value as Ativos', () => {
      server.use(listsHandler());
      const { result } = setup('/boards?archived=yes');

      expect(result.current.vm.state.tab).toBe('active');
    });

    it('writes ?archived=true for Arquivados and removes it for Ativos', async () => {
      server.use(listsHandler());
      const { result } = setup('/boards');

      act(() => result.current.vm.actions.selectTab('archived'));
      expect(result.current.location.search).toBe('?archived=true');
      expect(result.current.vm.state.tab).toBe('archived');
      await waitFor(() =>
        expect(result.current.vm.state.query.data).toEqual([oldPlans]),
      );

      act(() => result.current.vm.actions.selectTab('active'));
      expect(result.current.location.search).toBe('');
      expect(result.current.vm.state.tab).toBe('active');
    });

    it('retryLoad refetches the list after a load error', async () => {
      // 4xx is never retried by the query client, so the error shows at once.
      // A flag, not `once`: a request left over from another test cannot use up the failure.
      let failing = true;
      server.use(
        http.get(boardsUrl, () =>
          failing ? problem(404) : HttpResponse.json([roadmap]),
        ),
      );
      const { result } = setup();
      await waitFor(() =>
        expect(result.current.vm.state.query.isError).toBe(true),
      );

      failing = false;
      act(() => result.current.vm.actions.retryLoad());

      await waitFor(() =>
        expect(result.current.vm.state.query.data).toEqual([roadmap]),
      );
    });
  });

  describe('create', () => {
    it('opens and closes the create dialog', () => {
      server.use(listsHandler());
      const { result } = setup();

      expect(result.current.vm.state.dialog).toEqual({ kind: 'none' });
      act(() => result.current.vm.actions.openCreate());
      expect(result.current.vm.state.dialog).toEqual({ kind: 'create' });
      act(() => result.current.vm.actions.closeDialog());
      expect(result.current.vm.state.dialog).toEqual({ kind: 'none' });
    });

    it('on 201 closes the dialog, toasts "Quadro criado" and calls onCreated with the id', async () => {
      server.use(listsHandler());
      const bodies = createHandler(() =>
        HttpResponse.json(roadmap, { status: 201 }),
      );
      const { result, onCreated } = setup();
      act(() => result.current.vm.actions.openCreate());

      act(() => result.current.vm.actions.submitCreate(values));

      await waitFor(() => expect(onCreated).toHaveBeenCalledWith(roadmap.id));
      expect(bodies).toEqual([{ title: 'Roadmap' }]);
      expect(result.current.vm.state.dialog).toEqual({ kind: 'none' });
      screen.getByText('Quadro criado');
    });

    it('reports isCreating while the request is in flight', async () => {
      server.use(listsHandler());
      createHandler(() => HttpResponse.json(roadmap, { status: 201 }));
      const { result, onCreated } = setup();
      act(() => result.current.vm.actions.openCreate());

      act(() => result.current.vm.actions.submitCreate(values));

      await waitFor(() =>
        expect(result.current.vm.state.isCreating).toBe(true),
      );
      await waitFor(() => expect(onCreated).toHaveBeenCalled());
      expect(result.current.vm.state.isCreating).toBe(false);
    });

    it('on 500 keeps the dialog with the values and Tentar novamente resends the same body', async () => {
      server.use(listsHandler());
      const bodies = createHandler(
        () => problem(500),
        () => HttpResponse.json(roadmap, { status: 201 }),
      );
      const { result, onCreated } = setup();
      act(() => result.current.vm.actions.openCreate());

      act(() => result.current.vm.actions.submitCreate(values));

      await screen.findByText('Não foi possível salvar. Tente novamente.');
      expect(result.current.vm.state.dialog).toEqual({
        kind: 'create',
        values,
      });
      expect(onCreated).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

      await waitFor(() => expect(onCreated).toHaveBeenCalledWith(roadmap.id));
      expect(bodies).toEqual([{ title: 'Roadmap' }, { title: 'Roadmap' }]);
    });

    it('on 400 with errors[] sets the field errors and shows no toast', async () => {
      server.use(listsHandler());
      createHandler(() =>
        problem(400, [{ field: 'title', message: 'title too long' }]),
      );
      const { result } = setup();
      act(() => result.current.vm.actions.openCreate());

      act(() => result.current.vm.actions.submitCreate(values));

      await waitFor(() =>
        expect(result.current.vm.state.dialog).toEqual({
          kind: 'create',
          values,
          errors: { name: 'nameTooLong' },
        }),
      );
      expect(
        screen.queryByRole('button', { name: 'Tentar novamente' }),
      ).toBeNull();
      expect(
        screen.queryByText('Não foi possível salvar. Tente novamente.'),
      ).toBeNull();
    });

    it('on 401 shows no toast', async () => {
      server.use(listsHandler());
      createHandler(() => problem(401));
      const { result, onSessionExpired, onCreated } = setup();
      act(() => result.current.vm.actions.openCreate());

      act(() => result.current.vm.actions.submitCreate(values));

      await waitFor(() => expect(onSessionExpired).toHaveBeenCalled());
      await waitFor(() =>
        expect(result.current.vm.state.isCreating).toBe(false),
      );
      expect(
        screen.queryByText('Não foi possível salvar. Tente novamente.'),
      ).toBeNull();
      expect(onCreated).not.toHaveBeenCalled();
    });

    it('does not send invalid values and shows their field errors', () => {
      server.use(listsHandler());
      const bodies = createHandler();
      const { result } = setup();
      act(() => result.current.vm.actions.openCreate());
      const blank: BoardFormValues = { name: '   ', description: '' };

      act(() => result.current.vm.actions.submitCreate(blank));

      expect(result.current.vm.state.dialog).toEqual({
        kind: 'create',
        values: blank,
        errors: { name: 'nameRequired' },
      });
      expect(bodies).toEqual([]);
    });
  });
  describe('changes', () => {
    const edited: BoardFormValues = {
      name: ' Roadmap 2027 ',
      description: '  ',
    };
    const roadmapPath = `/api/v1/boards/${roadmap.id}`;

    it('opens the edit and delete dialogs for a board', () => {
      boardsServer();
      const { result } = setup();

      act(() => result.current.vm.actions.openEdit(roadmap));
      expect(result.current.vm.state.dialog).toEqual({
        kind: 'edit',
        board: roadmap,
      });
      act(() => result.current.vm.actions.openDelete(oldPlans));
      expect(result.current.vm.state.dialog).toEqual({
        kind: 'delete',
        board: oldPlans,
      });
      act(() => result.current.vm.actions.closeDialog());
      expect(result.current.vm.state.dialog).toEqual({ kind: 'none' });
    });

    it('edit closes the dialog, shows the new title before the response and toasts "Quadro salvo"', async () => {
      const held = gate();
      const { changes } = boardsServer(async () => {
        await held.wait();
        return HttpResponse.json({ ...roadmap, title: 'Roadmap 2027' });
      });
      const { result } = setup();
      await waitFor(() =>
        expect(result.current.vm.state.query.data).toEqual([roadmap, travel]),
      );
      act(() => result.current.vm.actions.openEdit(roadmap));

      act(() => result.current.vm.actions.submitEdit(roadmap, edited));

      expect(result.current.vm.state.dialog).toEqual({ kind: 'none' });
      await waitFor(() =>
        expect(result.current.vm.state.query.data?.[0]).toMatchObject({
          title: 'Roadmap 2027',
          description: null,
        }),
      );
      expect(result.current.vm.state.pendingIds).toEqual(new Set([roadmap.id]));
      expect(changes).toEqual([
        {
          method: 'PATCH',
          path: roadmapPath,
          body: { title: 'Roadmap 2027', description: null },
        },
      ]);

      held.open();

      await screen.findByText('Quadro salvo');
      expect(result.current.vm.state.pendingIds).toEqual(new Set());
    });

    it('edit with invalid values sends nothing and keeps the dialog with the field errors', () => {
      const { changes } = boardsServer();
      const { result } = setup();
      act(() => result.current.vm.actions.openEdit(roadmap));
      const blank: BoardFormValues = { name: '  ', description: '' };

      act(() => result.current.vm.actions.submitEdit(roadmap, blank));

      expect(result.current.vm.state.dialog).toEqual({
        kind: 'edit',
        board: roadmap,
        values: blank,
        errors: { name: 'nameRequired' },
      });
      expect(changes).toEqual([]);
    });

    it('edit 400 with errors[] reopens the dialog with the submitted values and field errors', async () => {
      boardsServer(() =>
        problem(400, [{ field: 'description', message: 'too long' }]),
      );
      const { result } = setup();
      act(() => result.current.vm.actions.openEdit(roadmap));

      act(() => result.current.vm.actions.submitEdit(roadmap, edited));

      await waitFor(() =>
        expect(result.current.vm.state.dialog).toEqual({
          kind: 'edit',
          board: roadmap,
          values: edited,
          errors: { description: 'descriptionTooLong' },
        }),
      );
      expect(screen.queryByText(saveFail)).toBeNull();
    });

    it('edit 500 toasts with Tentar novamente, which resends the same body', async () => {
      const { changes } = boardsServer(() => problem(500));
      const { result } = setup();

      act(() => result.current.vm.actions.submitEdit(roadmap, edited));

      await screen.findByText(saveFail);
      fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

      await screen.findByText('Quadro salvo');
      expect(changes).toEqual([
        {
          method: 'PATCH',
          path: roadmapPath,
          body: { title: 'Roadmap 2027', description: null },
        },
        {
          method: 'PATCH',
          path: roadmapPath,
          body: { title: 'Roadmap 2027', description: null },
        },
      ]);
    });

    it('archive removes the card at once, marks it pending and toasts "Quadro arquivado"', async () => {
      const held = gate();
      const { changes } = boardsServer(async () => {
        await held.wait();
        return HttpResponse.json(roadmap);
      });
      const { result } = setup();
      await waitFor(() =>
        expect(result.current.vm.state.query.data).toEqual([roadmap, travel]),
      );

      act(() => result.current.vm.actions.archive(roadmap));

      await waitFor(() =>
        expect(result.current.vm.state.query.data).toEqual([travel]),
      );
      expect(result.current.vm.state.pendingIds).toEqual(new Set([roadmap.id]));
      held.open();

      await screen.findByText('Quadro arquivado');
      expect(changes).toEqual([
        { method: 'POST', path: `${roadmapPath}/archive`, body: undefined },
      ]);
    });

    it('toasts each of two archives made at the same time', async () => {
      boardsServer();
      const { result } = setup();

      act(() => {
        result.current.vm.actions.archive(roadmap);
        result.current.vm.actions.archive(travel);
      });

      await waitFor(() =>
        expect(screen.getAllByText('Quadro arquivado')).toHaveLength(2),
      );
    });

    it('restore toasts "Quadro restaurado"', async () => {
      const { changes } = boardsServer();
      const { result } = setup('/boards?archived=true');

      act(() => result.current.vm.actions.restore(oldPlans));

      await screen.findByText('Quadro restaurado');
      expect(changes).toEqual([
        {
          method: 'POST',
          path: `/api/v1/boards/${oldPlans.id}/unarchive`,
          body: undefined,
        },
      ]);
    });

    it('confirmDelete closes the dialog, sends DELETE and toasts "Quadro excluído definitivamente"', async () => {
      const { changes } = boardsServer();
      const { result } = setup('/boards?archived=true');
      act(() => result.current.vm.actions.openDelete(oldPlans));

      act(() => result.current.vm.actions.confirmDelete(oldPlans));

      expect(result.current.vm.state.dialog).toEqual({ kind: 'none' });
      await screen.findByText('Quadro excluído definitivamente');
      expect(changes).toEqual([
        {
          method: 'DELETE',
          path: `/api/v1/boards/${oldPlans.id}`,
          body: undefined,
        },
      ]);
    });

    it('archive 500 toasts with Tentar novamente, which archives the same board after a tab switch', async () => {
      const { changes } = boardsServer(() => problem(500));
      const { result } = setup();

      act(() => result.current.vm.actions.archive(roadmap));
      await screen.findByText(saveFail);
      act(() => result.current.vm.actions.selectTab('archived'));
      fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

      await screen.findByText('Quadro arquivado');
      expect(changes.map(({ method, path }) => `${method} ${path}`)).toEqual([
        `POST ${roadmapPath}/archive`,
        `POST ${roadmapPath}/archive`,
      ]);
    });

    it('409 toasts the conflict with Recarregar, which refetches the lists', async () => {
      const { fetches } = boardsServer(() => problem(409));
      const { result } = setup();

      act(() => result.current.vm.actions.submitEdit(roadmap, edited));
      await screen.findByText(conflict);
      await waitFor(() =>
        expect(result.current.vm.state.pendingIds).toEqual(new Set()),
      );
      await waitFor(() =>
        expect(result.current.vm.state.query.isFetching).toBe(false),
      );
      const before = fetches.active;

      fireEvent.click(screen.getByRole('button', { name: 'Recarregar' }));

      await waitFor(() => expect(fetches.active).toBe(before + 1));
      expect(
        screen.queryByRole('button', { name: 'Tentar novamente' }),
      ).toBeNull();
    });

    it('404 toasts saveFail without a button and refetches the lists, even with another change pending', async () => {
      const held = gate();
      const { lists, fetches } = boardsServer(
        async () => {
          await held.wait();
          return HttpResponse.json(travel);
        },
        () => problem(404),
      );
      lists.archived = [];
      const { result } = setup('/boards?archived=true');
      await waitFor(() =>
        expect(result.current.vm.state.query.isSuccess).toBe(true),
      );
      const before = fetches.archived;
      // Still pending when the restore fails, so the shared settle refetch waits for it.
      act(() => result.current.vm.actions.archive(travel));

      act(() => result.current.vm.actions.restore(oldPlans));

      await screen.findByText(saveFail);
      await waitFor(() => expect(fetches.archived).toBe(before + 1));
      expect(result.current.vm.state.query.data).toEqual([]);
      expect(screen.queryByRole('button')).toBeNull();
      held.open();
    });

    it('401 on a change shows no toast', async () => {
      boardsServer(() => problem(401));
      const { result, onSessionExpired } = setup();

      act(() => result.current.vm.actions.archive(roadmap));

      await waitFor(() => expect(onSessionExpired).toHaveBeenCalled());
      await waitFor(() =>
        expect(result.current.vm.state.pendingIds).toEqual(new Set()),
      );
      expect(screen.queryByText(saveFail)).toBeNull();
      expect(screen.queryByText('Quadro arquivado')).toBeNull();
    });
  });
});
