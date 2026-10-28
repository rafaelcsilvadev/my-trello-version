import { Check } from 'lucide-react';
import { Checkbox as AriaCheckbox } from 'react-aria-components';

// Port of the Púrpura .p-check checkbox styles
// (design/_ds/.../css/components.css:64-70).
type CheckboxProps = {
  label: string;
  isSelected: boolean;
  onChange: (isSelected: boolean) => void;
  isDisabled?: boolean;
};

export function Checkbox({
  label,
  isSelected,
  onChange,
  isDisabled = false,
}: CheckboxProps) {
  // `relative` anchors React Aria's absolute hidden input, so a checkbox
  // inside a scroll container cannot widen the page.
  return (
    <AriaCheckbox
      isSelected={isSelected}
      onChange={onChange}
      isDisabled={isDisabled}
      className="group relative inline-flex cursor-pointer items-center data-disabled:cursor-not-allowed data-disabled:opacity-45"
    >
      <span className="grid size-5 flex-none place-content-center rounded-[5px] border border-border-default bg-surface-card transition-[background] duration-(--dur-fast) group-data-focus-visible:shadow-focus group-data-selected:border-purple-200 group-data-selected:bg-(--purple-50)">
        <Check
          aria-hidden
          className="hidden size-3 text-(--purple-600) group-data-selected:block"
          strokeWidth={3}
        />
      </span>
      <span className="sr-only">{label}</span>
    </AriaCheckbox>
  );
}
