import { useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Type a word and press Enter or comma to add it. Backspace in an empty box removes the last one. */
export function TagsInput({
  id,
  value,
  onChange,
  placeholder,
  maxLength = 60,
  invalid,
}: {
  id?: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  maxLength?: number;
  invalid?: boolean;
}) {
  const [draft, setDraft] = useState('');

  const add = (raw: string) => {
    const parts = raw
      .split(',')
      .map((t) => t.trim().slice(0, maxLength))
      .filter(Boolean);
    const next = [...value];
    for (const part of parts) {
      if (!next.some((t) => t.toLowerCase() === part.toLowerCase())) next.push(part);
    }
    if (next.length !== value.length) onChange(next);
    setDraft('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && draft === '' && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div
      className={cn(
        'flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-lg border bg-white px-2 py-1.5 shadow-xs focus-within:ring-3',
        invalid
          ? 'border-red-400 focus-within:border-red-500 focus-within:ring-red-100'
          : 'border-zinc-300 focus-within:border-brand-500 focus-within:ring-brand-100',
      )}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-md bg-zinc-100 py-0.5 pr-1 pl-2 text-sm text-zinc-800 ring-1 ring-zinc-200 ring-inset"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((t) => t !== tag))}
            className="cursor-pointer rounded p-0.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700"
            aria-label={`Remove ${tag}`}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => draft.trim() && add(draft)}
        placeholder={value.length ? '' : placeholder}
        className="min-w-24 flex-1 bg-transparent px-1 py-0.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
        aria-invalid={invalid || undefined}
      />
    </div>
  );
}
