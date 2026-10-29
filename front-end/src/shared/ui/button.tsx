import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps,
} from 'react-aria-components';

// Tailwind port of the Púrpura .p-btn styles (design/_ds/.../css/components.css:23-40).
const base =
  'inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-sm border font-medium leading-none transition-[background,box-shadow] duration-(--dur-fast) focus-visible:shadow-focus focus-visible:outline-none active:translate-y-[0.5px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45';

const variants = {
  primary:
    'border-transparent bg-brand text-on-brand hover:bg-brand-hover active:bg-(--brand-press)',
  secondary:
    'border-border-subtle bg-surface-card text-text-primary shadow-xs hover:bg-(--neutral-50) active:bg-neutral-100',
  danger:
    'border-transparent bg-danger text-(--text-on-dark) hover:bg-red-600 active:bg-red-700',
  soft: 'border-transparent bg-(--purple-50) text-purple-700 hover:bg-(--purple-100) active:bg-purple-200',
  // Prototype tl-ghost-btn (design/Task List.dc.html:82).
  ghost:
    'border-transparent bg-transparent text-text-secondary hover:bg-neutral-100 hover:text-text-primary active:bg-(--neutral-200)',
};

const sizes = {
  sm: 'h-(--control-sm) gap-1.5 px-2.5 text-sm',
  md: 'h-(--control-md) gap-2 px-3.5 text-md',
  lg: 'h-(--control-lg) gap-2.5 px-5 text-lg',
};

type ButtonProps = Omit<AriaButtonProps, 'className'> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  fullWidth?: boolean;
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  ...props
}: ButtonProps) {
  return (
    <AriaButton
      {...props}
      className={[base, variants[variant], sizes[size], fullWidth && 'w-full']
        .filter(Boolean)
        .join(' ')}
    />
  );
}
