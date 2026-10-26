import type { ReactNode } from 'react';
import {
  Dialog as AriaDialog,
  Heading,
  Modal,
  ModalOverlay,
} from 'react-aria-components';

// Tailwind port of the Púrpura .p-overlay/.p-dialog styles (design/_ds/.../css/components.css:144-150).
type DialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  role?: 'dialog' | 'alertdialog';
};

export function Dialog({
  isOpen,
  onOpenChange,
  title,
  children,
  footer,
  role = 'dialog',
}: DialogProps) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable
      className="fixed inset-0 z-100 flex items-center justify-center bg-surface-overlay p-6"
    >
      <Modal className="w-120 max-w-full overflow-hidden rounded-xl border border-border-subtle bg-surface-card shadow-lg">
        <AriaDialog role={role} className="outline-none">
          <div className="px-5 pt-4.5">
            <Heading
              slot="title"
              className="m-0 font-display text-[20px] font-semibold leading-[1.2] tracking-[-0.01em] text-text-primary"
            >
              {title}
            </Heading>
          </div>
          <div className="px-5 py-4">{children}</div>
          {footer && (
            <div className="flex justify-end gap-2 border-t border-border-subtle bg-neutral-25 px-5 py-3">
              {footer}
            </div>
          )}
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}
