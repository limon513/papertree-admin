import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface Choice<T extends string> {
  value: T;
  label: string;
  description?: ReactNode;
  icon?: ReactNode;
}

/** A few choices side by side, one picked (radio buttons that look like cards). */
export function ChoiceGroup<T extends string>({
  name,
  label,
  value,
  onChange,
  choices,
  disabled,
  className,
}: {
  name: string;
  label: string;
  value: T;
  onChange: (value: T) => void;
  choices: Choice<T>[];
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('grid gap-2 sm:grid-cols-2', className)}>
      {choices.map((c) => (
        <label
          key={c.value}
          className={cn(
            'flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors',
            value === c.value ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-500' : 'border-zinc-200 hover:bg-zinc-50',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          <input
            type="radio"
            name={name}
            value={c.value}
            checked={value === c.value}
            onChange={() => onChange(c.value)}
            disabled={disabled}
            className="mt-0.5 size-4 shrink-0 accent-brand-600"
          />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 font-medium text-zinc-900 [&_svg]:size-4 [&_svg]:text-zinc-500">
              {c.icon}
              {c.label}
            </span>
            {c.description && <span className="mt-0.5 block text-xs text-zinc-500">{c.description}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}
