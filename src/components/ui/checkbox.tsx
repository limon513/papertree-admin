import type { ComponentProps } from 'react';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'peer flex size-4.5 shrink-0 cursor-pointer items-center justify-center rounded-[5px] border border-zinc-300 bg-white shadow-xs transition-colors',
        'data-[state=checked]:border-brand-700 data-[state=checked]:bg-brand-700 data-[state=checked]:text-white',
        'data-[state=indeterminate]:border-brand-700 data-[state=indeterminate]:bg-brand-700 data-[state=indeterminate]:text-white',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="group">
        <Check className="size-3.5 group-data-[state=indeterminate]:hidden" strokeWidth={3} />
        <Minus className="hidden size-3.5 group-data-[state=indeterminate]:block" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
