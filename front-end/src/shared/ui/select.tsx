import { ChevronDown } from 'lucide-react';

// Tailwind port of the Púrpura .p-select.p-select--md styles
// (design/_ds/.../css/components.css:50-58). The chevron is an icon
// instead of the CSS background image.
const selectClasses =
  'h-(--control-md) w-full cursor-pointer appearance-none rounded-sm border border-border-subtle bg-surface-card pr-8.5 pl-2.5 text-md font-medium leading-[1.2] text-text-primary shadow-xs outline-none transition-[border-color,box-shadow] duration-(--dur-fast) focus:border-border-focus focus:shadow-focus';

type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
};

export function Select({ label, value, options, onChange }: SelectProps) {
  return (
    <span className="relative inline-flex">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className={selectClasses}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        size={14}
        strokeWidth={2}
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-text-secondary"
      />
    </span>
  );
}
