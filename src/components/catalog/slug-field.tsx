import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { slugify } from '@/lib/utils';

/**
 * Slug state for a form. For a new item the slug follows the name until the user edits it.
 * For an existing item it never changes by itself, because that would break old links.
 */
export function useSlug(name: string, saved: string | undefined) {
  const [typed, setTyped] = useState<string | null>(saved ?? null);
  const slug = typed ?? slugify(name);
  return { slug, setSlug: setTyped, changed: saved !== undefined && slugify(slug) !== saved };
}

export function SlugField({
  id,
  prefix,
  value,
  onChange,
  changed,
  error,
}: {
  id: string;
  /** Path before the slug, e.g. "/brand/". */
  prefix: string;
  value: string;
  onChange: (value: string) => void;
  /** True when editing and the slug differs from the saved one. */
  changed: boolean;
  error?: string;
}) {
  return (
    <Field
      label="URL name"
      htmlFor={id}
      error={error}
      hint={
        changed ? (
          <span className="flex items-start gap-1.5 text-amber-700">
            <AlertTriangle className="mt-px size-3.5 shrink-0" />
            Old links to this page will stop working, including links on Google.
          </span>
        ) : (
          'Made from the name. Letters, numbers and dashes only.'
        )
      }
    >
      <div className="flex">
        <span className="flex items-center rounded-l-lg border border-r-0 border-zinc-300 bg-zinc-50 px-3 text-sm text-zinc-500">
          {prefix}
        </span>
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => onChange(slugify(value))}
          invalid={!!error}
          className="rounded-l-none"
          spellCheck={false}
        />
      </div>
    </Field>
  );
}
