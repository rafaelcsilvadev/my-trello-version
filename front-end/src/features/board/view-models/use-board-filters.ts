import { useState } from 'react';

import {
  type BoardFilters,
  type DueFilter,
  NO_FILTERS,
} from '../model/filters';

// Plain state: the board screen is keyed by board id, so opening a board starts unfiltered (FBF-37).
export function useBoardFilters() {
  const [filters, setFilters] = useState<BoardFilters>(NO_FILTERS);

  function setQuery(query: string) {
    setFilters((current) => ({ ...current, query }));
  }

  function setLabelIds(labelIds: string[]) {
    setFilters((current) => ({ ...current, labelIds }));
  }

  function setDue(due: DueFilter) {
    setFilters((current) => ({ ...current, due }));
  }

  // FBF-05: Esc and the clear button empty the search only.
  function clearQuery() {
    setQuery('');
  }

  // FBF-25.
  function clearAll() {
    setFilters(NO_FILTERS);
  }

  return { filters, setQuery, setLabelIds, setDue, clearQuery, clearAll };
}
