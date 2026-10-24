import { ListChecks } from 'lucide-react';

// Port of the prototype header logo (design/Task List.dc.html:131-134).
// The wordmark is the product name, so it is not translated.
export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <span className="flex size-7 items-center justify-center rounded-md bg-brand text-on-brand">
        <ListChecks size={16} aria-hidden="true" />
      </span>
      <span className="font-display text-xl leading-none font-semibold tracking-tight text-text-primary">
        My Trello Version
      </span>
    </span>
  );
}
