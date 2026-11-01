import type { ComponentProps, ReactNode } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { cn, initials } from '@/lib/utils';
import { Button } from './button';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-5 animate-spin text-brand-600', className)} />;
}

export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('animate-pulse rounded-md bg-zinc-200/70', className)} {...props} />;
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800',
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

/** Red box for an error that is not tied to a single field. */
export function ErrorAlert({ message, className }: { message: string; className?: string }) {
  return (
    <div
      role="alert"
      className={cn('flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700', className)}
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/** Shown when a list failed to load. */
export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-red-50">
        <AlertCircle className="size-5 text-red-600" />
      </div>
      <div>
        <p className="font-medium text-zinc-900">Could not load this page</p>
        <p className="mt-1 text-sm text-zinc-500">{message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-700 [&_svg]:size-6">
        {icon}
      </div>
      <div>
        <p className="font-medium text-zinc-900">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
