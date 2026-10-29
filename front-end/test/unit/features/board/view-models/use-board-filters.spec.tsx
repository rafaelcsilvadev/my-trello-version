import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NO_FILTERS } from '@/features/board/model/filters';
import { useBoardFilters } from '@/features/board/view-models/use-board-filters';

function renderFilters() {
  return renderHook(() => useBoardFilters());
}

describe('useBoardFilters', () => {
  it('starts with no filters', () => {
    const { result } = renderFilters();

    expect(result.current.filters).toEqual(NO_FILTERS);
  });

  it('sets the query and keeps labels and due', () => {
    const { result } = renderFilters();

    act(() => result.current.setQuery('ação'));

    expect(result.current.filters).toEqual({
      query: 'ação',
      labelIds: [],
      due: 'any',
    });
  });

  it('sets the label ids and keeps the query and due', () => {
    const { result } = renderFilters();

    act(() => result.current.setLabelIds(['lb1', 'lb2']));

    expect(result.current.filters).toEqual({
      query: '',
      labelIds: ['lb1', 'lb2'],
      due: 'any',
    });
  });

  it('sets the due filter and keeps the query and labels', () => {
    const { result } = renderFilters();

    act(() => result.current.setDue('overdue'));

    expect(result.current.filters).toEqual({
      query: '',
      labelIds: [],
      due: 'overdue',
    });
  });

  it('keeps every field when the next setter runs', () => {
    const { result } = renderFilters();

    act(() => {
      result.current.setQuery('deploy');
      result.current.setLabelIds(['lb1']);
      result.current.setDue('today');
    });

    expect(result.current.filters).toEqual({
      query: 'deploy',
      labelIds: ['lb1'],
      due: 'today',
    });
  });

  it('clears only the query, keeping labels and due', () => {
    const { result } = renderFilters();
    act(() => {
      result.current.setQuery('deploy');
      result.current.setLabelIds(['lb1']);
      result.current.setDue('done');
    });

    act(() => result.current.clearQuery());

    expect(result.current.filters).toEqual({
      query: '',
      labelIds: ['lb1'],
      due: 'done',
    });
  });

  it('clears all three filters', () => {
    const { result } = renderFilters();
    act(() => {
      result.current.setQuery('deploy');
      result.current.setLabelIds(['lb1']);
      result.current.setDue('none');
    });

    act(() => result.current.clearAll());

    expect(result.current.filters).toEqual(NO_FILTERS);
  });

  it('starts empty again after a remount', () => {
    const first = renderFilters();
    act(() => {
      first.result.current.setQuery('deploy');
      first.result.current.setLabelIds(['lb1']);
      first.result.current.setDue('overdue');
    });
    first.unmount();

    const { result } = renderFilters();

    expect(result.current.filters).toEqual(NO_FILTERS);
  });
});
