import { Link } from 'react-router';
import { Check } from 'lucide-react';
import { LABEL_STYLE, useLabels } from '@/hooks/use-labels';
import { cn } from '@/lib/utils';

/** Pick a product's website tags: every tag as a chip, tap to turn it on or off. */
export function LabelPicker({ id, value, onChange }: { id: string; value: number[]; onChange: (ids: number[]) => void }) {
  const labels = useLabels();
  const items = labels.data?.items ?? [];
  if (labels.isPending) return <p className="text-sm text-zinc-400">Loading tags…</p>;
  if (!items.length) {
    return (
      <p className="text-sm text-zinc-500">
        No tags yet.{' '}
        <Link to="/tags" className="font-medium text-brand-700 hover:underline">
          Add tags
        </Link>
      </p>
    );
  }
  const toggle = (labelId: number) => onChange(value.includes(labelId) ? value.filter((x) => x !== labelId) : [...value, labelId]);
  return (
    <div id={id} className="flex flex-wrap gap-2" role="group" aria-label="Tags">
      {items.map((l) => {
        const on = value.includes(l.id);
        return (
          <button
            key={l.id}
            type="button"
            onClick={() => toggle(l.id)}
            aria-pressed={on}
            className={cn(
              'flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-bold tracking-wide uppercase transition',
              on ? cn(LABEL_STYLE[l.color], 'ring-2 ring-brand-600 ring-offset-1') : 'bg-white text-zinc-500 ring-1 ring-zinc-300 hover:text-zinc-800',
              !l.isActive && 'opacity-60',
            )}
            title={l.isActive ? undefined : 'Hidden on the website'}
          >
            {on && <Check className="size-3.5" />}
            {l.name}
          </button>
        );
      })}
    </div>
  );
}
