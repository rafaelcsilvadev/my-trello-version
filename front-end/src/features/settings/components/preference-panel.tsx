import { SegmentedTabs } from '@/shared/ui/tabs';

type PreferencePanelProps = {
  title: string;
  subtitle?: string;
  options: { id: string; label: string }[];
  selected: string;
  onChange: (id: string) => void;
};

// Port of the prototype settings panels (design/Task List.dc.html:563-584).
export function PreferencePanel({
  title,
  subtitle,
  options,
  selected,
  onChange,
}: PreferencePanelProps) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface-card px-4.5 py-4">
      <h2 className="text-lg font-medium text-text-primary">{title}</h2>
      <div>
        <SegmentedTabs
          label={title}
          options={options}
          selected={selected}
          onChange={onChange}
        />
      </div>
      {subtitle && <p className="text-sm text-text-secondary">{subtitle}</p>}
    </section>
  );
}
