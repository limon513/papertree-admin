import { useState, type ComponentProps } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

const base =
  'flex h-10 w-full rounded-lg border bg-white px-3 text-sm text-zinc-900 shadow-xs transition-colors ' +
  'placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-3 ' +
  'disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500';

export function inputClasses(invalid?: boolean) {
  return cn(
    base,
    invalid
      ? 'border-red-400 focus-visible:border-red-500 focus-visible:ring-red-100'
      : 'border-zinc-300 focus-visible:border-brand-500 focus-visible:ring-brand-100',
  );
}

export interface InputProps extends ComponentProps<'input'> {
  invalid?: boolean;
}

export function Input({ className, invalid, ...props }: InputProps) {
  return <input className={cn(inputClasses(invalid), className)} aria-invalid={invalid || undefined} {...props} />;
}

/** Password input with a show/hide button. */
export function PasswordInput({ className, invalid, ...props }: InputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input type={visible ? 'text' : 'password'} invalid={invalid} className={cn('pr-10', className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-10 cursor-pointer items-center justify-center text-zinc-400 hover:text-zinc-700"
        aria-label={visible ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export interface TextareaProps extends ComponentProps<'textarea'> {
  invalid?: boolean;
}

export function Textarea({ className, invalid, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(inputClasses(invalid), 'h-auto min-h-20 py-2', className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export interface SelectProps extends ComponentProps<'select'> {
  invalid?: boolean;
}

/** Native select: simple, fast and works well on phones. */
export function Select({ className, invalid, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        inputClasses(invalid),
        'cursor-pointer appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%2371717a%22%3E%3Cpath%20d%3D%22M5.3%207.3a1%201%200%200%201%201.4%200L10%2010.6l3.3-3.3a1%201%200%201%201%201.4%201.4l-4%204a1%201%200%200%201-1.4%200l-4-4a1%201%200%200%201%200-1.4z%22%2F%3E%3C%2Fsvg%3E")] bg-[length:1.25rem] bg-[right_0.6rem_center] bg-no-repeat pr-9',
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    >
      {children}
    </select>
  );
}
