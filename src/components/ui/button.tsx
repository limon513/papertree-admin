import type { ComponentProps } from 'react';
import { Slot } from 'radix-ui';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const variants = {
  primary: 'bg-brand-700 text-white shadow-sm hover:bg-brand-800 active:bg-brand-900',
  secondary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200',
  outline: 'border border-zinc-300 bg-white text-zinc-800 shadow-xs hover:bg-zinc-50',
  ghost: 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
  link: 'text-brand-700 underline-offset-4 hover:underline px-0 h-auto',
} as const;

const sizes = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-base gap-2',
  icon: 'size-9',
} as const;

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
  asChild?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  asChild = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button';
  return (
    <Comp
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg font-medium whitespace-nowrap transition-colors',
        'disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Loader2 className="animate-spin" />}
          {children}
        </>
      )}
    </Comp>
  );
}
