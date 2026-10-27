import { Switch as AriaSwitch } from 'react-aria-components';

// Port of the Púrpura .p-switch styles
// (design/_ds/.../css/components.css:71-74).
type SwitchProps = {
  label: string;
  isSelected: boolean;
  onChange: (isSelected: boolean) => void;
};

export function Switch({ label, isSelected, onChange }: SwitchProps) {
  return (
    <AriaSwitch
      isSelected={isSelected}
      onChange={onChange}
      className="group inline-flex cursor-pointer items-center gap-2.5 text-sm text-text-primary"
    >
      <span className="relative h-5 w-8.5 flex-none rounded-full bg-neutral-300 transition-[background] group-data-focus-visible:shadow-focus group-data-selected:bg-brand">
        <span className="absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform ease-(--ease-emphasized) group-data-selected:translate-x-3.5" />
      </span>
      {label}
    </AriaSwitch>
  );
}
