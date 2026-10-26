import { Tab, TabList, Tabs } from 'react-aria-components';

// Port of the Púrpura .p-segmented/.p-segment styles
// (design/_ds/.../css/components.css:109-111).
type SegmentedTabsOption = {
  id: string;
  label: string;
};

type SegmentedTabsProps = {
  label: string;
  options: SegmentedTabsOption[];
  selected: string;
  onChange: (id: string) => void;
};

export function SegmentedTabs({
  label,
  options,
  selected,
  onChange,
}: SegmentedTabsProps) {
  return (
    <Tabs
      selectedKey={selected}
      onSelectionChange={(key) => {
        onChange(String(key));
      }}
    >
      <TabList
        aria-label={label}
        className="inline-flex gap-0.5 rounded-md bg-neutral-100 p-0.5"
      >
        {options.map(({ id, label: optionLabel }) => (
          <Tab
            key={id}
            id={id}
            className="inline-flex h-7.5 min-w-8 cursor-pointer items-center justify-center gap-1.5 rounded-[6px] px-2.5 text-sm font-medium text-text-tertiary outline-none data-focus-visible:shadow-focus data-selected:bg-surface-card data-selected:text-text-primary data-selected:shadow-sm"
          >
            {optionLabel}
          </Tab>
        ))}
      </TabList>
    </Tabs>
  );
}
