import { Move } from 'lucide-react';

type MoveBannerProps = {
  text: string;
};

// Port of the prototype keyboard move banner (design/Task List.dc.html:356).
// The live region carries the announcement, so the icon stays decorative.
export function MoveBanner({ text }: MoveBannerProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-brand-soft text-purple-700 font-medium text-sm">
      <Move size={16} aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}
