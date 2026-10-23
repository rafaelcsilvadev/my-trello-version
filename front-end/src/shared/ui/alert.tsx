import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

// Port of the prototype form alert box (design/Task List.dc.html:141-145).
const tones = {
  danger: { role: 'alert', classes: 'bg-red-50 text-red-700' },
  info: { role: 'status', classes: 'bg-blue-50 text-blue-700' },
} as const;

type AlertProps = {
  tone: keyof typeof tones;
  icon: LucideIcon;
  children: ReactNode;
};

export function Alert({ tone, icon: Icon, children }: AlertProps) {
  const { role, classes } = tones[tone];

  return (
    <div
      role={role}
      className={`flex items-center gap-2 rounded-sm px-3 py-2.5 text-sm font-medium ${classes}`}
    >
      <Icon size={16} aria-hidden="true" className="shrink-0" />
      <span>{children}</span>
    </div>
  );
}
