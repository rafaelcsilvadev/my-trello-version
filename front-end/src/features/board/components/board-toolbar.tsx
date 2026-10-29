import { useTranslation } from 'react-i18next';

import { Select } from '@/shared/ui/select';
import { Switch } from '@/shared/ui/switch';

import type { BoardFilters, DueFilter } from '../model/filters';
import type { Label } from '../model/types';
import { BoardSearch } from './board-search';
import { FilterSummary } from './filter-summary';
import { LabelFilter } from './label-filter';

type BoardToolbarProps = {
  filters: BoardFilters;
  labels: Label[];
  selectedLabelCount: number;
  isFiltering: boolean;
  matchCount: number;
  isSearchShortcutEnabled: boolean;
  showArchived: boolean;
  onQueryChange: (query: string) => void;
  onQueryClear: () => void;
  onLabelIdsChange: (ids: string[]) => void;
  onDueChange: (due: DueFilter) => void;
  onClearAll: () => void;
  onShowArchivedChange: (showArchived: boolean) => void;
};

// Option order and i18n keys of the "Prazo" select (FBF-16).
const DUE_OPTIONS = [
  { value: 'any', key: 'board.toolbar.dueAny' },
  { value: 'overdue', key: 'board.toolbar.dueOverdue' },
  { value: 'today', key: 'board.toolbar.dueToday' },
  { value: 'none', key: 'board.toolbar.dueNone' },
  { value: 'done', key: 'board.toolbar.dueDone' },
] as const satisfies readonly { value: DueFilter; key: string }[];

// Port of the prototype board toolbar (design/Task List.dc.html:323-351).
export function BoardToolbar({
  filters,
  labels,
  selectedLabelCount,
  isFiltering,
  matchCount,
  isSearchShortcutEnabled,
  showArchived,
  onQueryChange,
  onQueryClear,
  onLabelIdsChange,
  onDueChange,
  onClearAll,
  onShowArchivedChange,
}: BoardToolbarProps) {
  const { t } = useTranslation();

  return (
    // <search> carries the implicit role="search" (FBF-40).
    <search className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
      <BoardSearch
        value={filters.query}
        isShortcutEnabled={isSearchShortcutEnabled}
        onChange={onQueryChange}
        onClear={onQueryClear}
      />
      <LabelFilter
        labels={labels}
        selectedIds={filters.labelIds}
        selectedCount={selectedLabelCount}
        onChange={onLabelIdsChange}
      />
      <Select
        label={t('board.toolbar.due')}
        value={filters.due}
        options={DUE_OPTIONS.map(({ value, key }) => ({
          value,
          label: t(key),
        }))}
        // The options are the DueFilter values, so the select only reports one of them.
        onChange={(value) => onDueChange(value as DueFilter)}
      />
      <Switch
        label={t('board.toolbar.showArchived')}
        isSelected={showArchived}
        onChange={onShowArchivedChange}
      />
      <div className="flex-1" />
      {isFiltering ? (
        <FilterSummary matchCount={matchCount} onClear={onClearAll} />
      ) : null}
    </search>
  );
}
