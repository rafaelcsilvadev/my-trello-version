import type { Label } from '../model/types';

// Full class names, so Tailwind finds them in the source (it cannot see `bg-label-${color}`).
const LABEL_CLASSES: Record<Label['color'], { chip: string; dot: string }> = {
  green: { chip: 'bg-label-green/18', dot: 'bg-label-green' },
  yellow: { chip: 'bg-label-yellow/18', dot: 'bg-label-yellow' },
  orange: { chip: 'bg-label-orange/18', dot: 'bg-label-orange' },
  red: { chip: 'bg-label-red/18', dot: 'bg-label-red' },
  purple: { chip: 'bg-label-purple/18', dot: 'bg-label-purple' },
  blue: { chip: 'bg-label-blue/18', dot: 'bg-label-blue' },
  sky: { chip: 'bg-label-sky/18', dot: 'bg-label-sky' },
  lime: { chip: 'bg-label-lime/18', dot: 'bg-label-lime' },
  pink: { chip: 'bg-label-pink/18', dot: 'bg-label-pink' },
  black: { chip: 'bg-label-black/18', dot: 'bg-label-black' },
};

// A label chip with its color dot, shared by the card tile and the label filter.
export function LabelChip({ label }: { label: Label }) {
  const classes = LABEL_CLASSES[label.color];
  return (
    <span
      className={`inline-flex h-5.5 items-center gap-1.5 rounded-xs px-2 text-xs leading-none font-medium whitespace-nowrap text-text-primary ${classes.chip}`}
    >
      <span className={`size-2 flex-none rounded-xs ${classes.dot}`} />
      <span>{label.name}</span>
    </span>
  );
}
