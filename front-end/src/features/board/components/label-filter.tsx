import { Check, Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Menu, MenuItem, MenuTrigger, Popover } from 'react-aria-components';

import { Button } from '@/shared/ui/button';

import type { Label } from '../model/types';
import { LabelChip } from './label-chip';

type LabelFilterProps = {
  labels: Label[];
  selectedIds: string[];
  selectedCount: number;
  onChange: (ids: string[]) => void;
};

// Port of the prototype label filter menu (design/Task List.dc.html:331-341).
export function LabelFilter({
  labels,
  selectedIds,
  selectedCount,
  onChange,
}: LabelFilterProps) {
  const { t } = useTranslation();

  return (
    <MenuTrigger>
      <Button variant={selectedCount > 0 ? 'soft' : 'secondary'}>
        <Tag size={16} aria-hidden />
        {selectedCount > 0
          ? t('board.toolbar.labelsCount', { count: selectedCount })
          : t('board.toolbar.labels')}
      </Button>
      {/* ActionMenu popover classes (shared/ui/menu.tsx), at the prototype width. */}
      <Popover
        placement="bottom start"
        className="max-h-75 w-60 overflow-auto rounded-lg border border-border-subtle bg-surface-card p-1.5 shadow-lg"
      >
        {/* SPEC_DEVIATION: no aria-label "Etiquetas" on the Menu.
            Reason: MenuTrigger names the menu after its button (aria-labelledby wins),
            so the menu reads "Etiquetas" or "Etiquetas · {n}" like the button. */}
        <Menu
          selectionMode="multiple"
          selectedKeys={selectedIds}
          onSelectionChange={(keys) => {
            // Multiple selection never yields "all": every key is listed.
            if (keys !== 'all') onChange([...keys].map(String));
          }}
          renderEmptyState={() => (
            <div className="p-3 text-sm text-text-tertiary">
              {t('board.toolbar.noLabels')}
            </div>
          )}
          className="flex flex-col gap-0.5 outline-none"
        >
          {labels.map((label) => (
            <MenuItem
              key={label.id}
              id={label.id}
              textValue={label.name}
              className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-sm px-2 outline-none hover:bg-neutral-100 data-focus-visible:outline-2 data-focus-visible:outline-border-focus"
            >
              {/* SPEC_DEVIATION: draws the Checkbox box instead of rendering the shared Checkbox.
                  Reason: its hidden input would be a second focusable control inside the
                  menuitemcheckbox, which already carries aria-checked. */}
              <span
                aria-hidden
                className="grid size-5 flex-none place-content-center rounded-[5px] border border-border-default bg-surface-card in-data-selected:border-purple-200 in-data-selected:bg-(--purple-50)"
              >
                <Check
                  className="hidden size-3 text-(--purple-600) in-data-selected:block"
                  strokeWidth={3}
                />
              </span>
              <LabelChip label={label} />
            </MenuItem>
          ))}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
