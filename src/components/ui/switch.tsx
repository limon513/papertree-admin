import type { ComponentProps, ReactNode } from 'react';
import { Switch as SwitchPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full bg-zinc-300 p-0.5 transition-colors',
        'focus-visible:ring-3 focus-visible:ring-brand-100 focus-visible:outline-none',
        'data-[state=checked]:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-4 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-4" />
    </SwitchPrimitive.Root>
  );
}

/** An on/off setting in a form: label and help text on the left, switch on the right. */
export function SwitchField({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description?: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-zinc-200 px-3 py-3 hover:bg-zinc-50"
    >
      <span>
        <span className="block text-sm font-medium text-zinc-900">{label}</span>
        {description && <span className="block text-xs text-zinc-500">{description}</span>}
      </span>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} className="mt-0.5" />
    </label>
  );
}
