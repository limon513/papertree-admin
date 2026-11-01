import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const variants = {
  gray: 'bg-zinc-100 text-zinc-700 ring-zinc-200',
  green: 'bg-brand-50 text-brand-700 ring-brand-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
} as const;

export interface BadgeProps extends ComponentProps<'span'> {
  variant?: keyof typeof variants;
}

export function Badge({ variant = 'gray', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset [&_svg]:size-3',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
