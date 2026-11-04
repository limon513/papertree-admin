import type { ReactNode } from 'react';
import { ApiError, errorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ErrorAlert, Spinner } from '@/components/ui/misc';

/** "1250" -> 1250, "" -> null. Not a number -> NaN (the server explains). */
export const toNumber = (text: string) => (text.trim() === '' ? null : Number(text.replace(/,/g, '')));
export const toText = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n));

/** Field errors from a failed save, and a general message when there are none. */
export function saveErrors(error: unknown) {
  const fields = error instanceof ApiError ? error.fields : {};
  const general = error && Object.keys(fields).length === 0 ? errorMessage(error) : null;
  return { fields, general };
}

/** A settings block: title and text on the left, the fields on the right. */
export function Section({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-b border-zinc-200 py-6 first:pt-0 last:border-b-0 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
      <div>
        <h2 className="font-medium text-zinc-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
      </div>
      <div className="min-w-0 space-y-4">{children}</div>
    </section>
  );
}

/** Save bar under a settings form. */
export function SaveBar({ dirty, saving, error, onReset }: { dirty: boolean; saving: boolean; error: string | null; onReset: () => void }) {
  return (
    <div className="sticky bottom-0 -mx-5 mt-2 border-t border-zinc-200 bg-white/95 px-5 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      {error && <ErrorAlert message={error} className="mb-3" />}
      <div className="flex items-center justify-end gap-2">
        {dirty && <span className="mr-auto text-sm text-amber-700">You have unsaved changes</span>}
        <Button type="button" variant="ghost" onClick={onReset} disabled={!dirty || saving}>
          Undo changes
        </Button>
        <Button type="submit" disabled={!dirty || saving}>
          {saving && <Spinner className="size-4 text-white" />}
          Save
        </Button>
      </div>
    </div>
  );
}
