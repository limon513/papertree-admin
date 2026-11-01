import { useState } from 'react';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { STORE_DOMAIN } from '@/lib/store';
import { cn } from '@/lib/utils';

const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 160;

function Counter({ length, limit }: { length: number; limit: number }) {
  return (
    <span className={cn('tabular-nums', length > limit ? 'text-amber-700' : 'text-zinc-400')}>
      {length}/{limit}
    </span>
  );
}

/**
 * How the page looks on Google, with optional custom title and description.
 * Empty fields fall back to the name and description, as the storefront will do.
 */
export function SeoFields({
  idPrefix,
  path,
  title,
  description,
  onTitleChange,
  onDescriptionChange,
  fallbackTitle,
  fallbackDescription,
  errors,
}: {
  idPrefix: string;
  /** Page path, e.g. "/brand/faber-castell". */
  path: string;
  title: string;
  description: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  fallbackTitle: string;
  fallbackDescription: string;
  errors: { seoTitle?: string; seoDescription?: string };
}) {
  const [editing, setEditing] = useState(Boolean(title || description || errors.seoTitle || errors.seoDescription));
  const shownTitle = title.trim() || fallbackTitle.trim() || 'Page title';
  const shownDescription =
    description.trim() || fallbackDescription.trim() || 'Add a description to show here on Google.';

  return (
    <div className="rounded-lg border border-zinc-200">
      <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2.5">
        <span className="text-sm font-medium text-zinc-800">Google preview</span>
        {!editing && (
          <button
            type="button"
            className="cursor-pointer text-sm font-medium text-brand-700 hover:underline"
            onClick={() => setEditing(true)}
          >
            Edit
          </button>
        )}
      </div>

      <div className="space-y-0.5 px-3 py-3">
        <div className="truncate text-xs text-zinc-600">
          {STORE_DOMAIN}
          {path}
        </div>
        <div className="truncate text-lg leading-snug text-[#1a0dab]">{shownTitle}</div>
        <p className="line-clamp-2 text-sm text-zinc-600">{shownDescription}</p>
      </div>

      {editing && (
        <div className="space-y-4 border-t border-zinc-100 px-3 py-3">
          <Field
            label="Page title"
            htmlFor={`${idPrefix}-seo-title`}
            error={errors.seoTitle}
            hint={
              <span className="flex justify-between gap-2">
                <span>Empty = use the name. Best under {TITLE_LIMIT} characters.</span>
                <Counter length={title.length} limit={TITLE_LIMIT} />
              </span>
            }
          >
            <Input
              id={`${idPrefix}-seo-title`}
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              invalid={!!errors.seoTitle}
              placeholder={fallbackTitle}
            />
          </Field>
          <Field
            label="Meta description"
            htmlFor={`${idPrefix}-seo-description`}
            error={errors.seoDescription}
            hint={
              <span className="flex justify-between gap-2">
                <span>Empty = use the description. Best under {DESCRIPTION_LIMIT} characters.</span>
                <Counter length={description.length} limit={DESCRIPTION_LIMIT} />
              </span>
            }
          >
            <Textarea
              id={`${idPrefix}-seo-description`}
              rows={3}
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              invalid={!!errors.seoDescription}
            />
          </Field>
        </div>
      )}
    </div>
  );
}
