import type { ReactNode } from 'react';
import { AlertDialog } from 'radix-ui';
import { AlertTriangle } from 'lucide-react';
import { Button } from './button';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
}

/** "Are you sure?" dialog. Stays open while the action runs; the caller closes it on success. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  danger = false,
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={(next) => !loading && onOpenChange(next)}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-zinc-950/40 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-5 shadow-xl data-[state=open]:animate-zoom-in focus:outline-none">
          <div className="flex gap-4">
            {danger && (
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50">
                <AlertTriangle className="size-5 text-red-600" />
              </div>
            )}
            <div className="space-y-2">
              <AlertDialog.Title className="text-base font-semibold text-zinc-900">{title}</AlertDialog.Title>
              <AlertDialog.Description className="text-sm text-zinc-600">{description}</AlertDialog.Description>
            </div>
          </div>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialog.Cancel asChild>
              <Button variant="outline" disabled={loading}>
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
