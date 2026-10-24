import type { ReactNode } from 'react';

import { Logo } from '@/shared/ui/logo';

// Port of the prototype auth screen frame (design/Task List.dc.html:130-139).
type AuthCardProps = {
  title: string;
  subtitle: string;
  footer: ReactNode;
  children: ReactNode;
};

export function AuthCard({ title, subtitle, footer, children }: AuthCardProps) {
  return (
    <div className="flex min-h-dvh flex-col overflow-auto bg-auth">
      <div className="px-7 py-6">
        <Logo />
      </div>
      <div className="m-auto flex w-full max-w-105 flex-col gap-4 px-5 pt-4 pb-16">
        <div className="mb-2 text-center">
          <h1 className="font-display text-3xl leading-tight font-semibold tracking-tight text-text-primary">
            {title}
          </h1>
          <p className="mt-2.5 text-md text-text-secondary">{subtitle}</p>
        </div>
        {children}
        <div className="text-center text-md text-text-secondary">{footer}</div>
      </div>
    </div>
  );
}
