import { Ellipsis, type LucideIcon } from 'lucide-react';
import {
  Button,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
} from 'react-aria-components';

// Port of the prototype tl-menu/tl-menu-item styles (design/Task List.dc.html:74-75)
// behind the Púrpura .p-btn--icon trigger (design/_ds/.../css/components.css:41-43).
const tones = {
  default: 'text-text-primary',
  danger: 'text-red-600',
};

type ActionMenuItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  tone?: 'danger';
  onAction: () => void;
};

type ActionMenuProps = {
  label: string;
  items: ActionMenuItem[];
  isDisabled?: boolean;
};

export function ActionMenu({ label, items, isDisabled }: ActionMenuProps) {
  return (
    <MenuTrigger>
      <Button
        aria-label={label}
        isDisabled={isDisabled}
        className="inline-flex size-(--control-md) cursor-pointer items-center justify-center rounded-md bg-transparent text-text-secondary hover:bg-neutral-100 focus-visible:shadow-focus focus-visible:outline-none disabled:pointer-events-none disabled:opacity-45 aria-expanded:bg-(--purple-50) aria-expanded:text-purple-700"
      >
        <Ellipsis size={16} aria-hidden />
      </Button>
      <Popover
        placement="bottom end"
        className="w-47.5 rounded-lg border border-border-subtle bg-surface-card p-1.5 shadow-lg"
      >
        <Menu aria-label={label} className="flex flex-col outline-none">
          {items.map(({ id, label: itemLabel, icon: Icon, tone, onAction }) => (
            <MenuItem
              key={id}
              id={id}
              textValue={itemLabel}
              onAction={onAction}
              className={`flex h-8.5 cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-sm px-2.5 text-md outline-none hover:bg-neutral-100 data-focus-visible:outline-2 data-focus-visible:outline-border-focus ${tones[tone ?? 'default']}`}
            >
              <Icon size={16} aria-hidden />
              <span>{itemLabel}</span>
            </MenuItem>
          ))}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
