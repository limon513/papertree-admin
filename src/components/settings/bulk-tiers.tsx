import { Plus, Trash2 } from 'lucide-react';
import type { BulkTier } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { AddonInput } from '@/components/ui/input';

/** A step as typed: numbers stay text while typing. */
export interface TierForm {
  key: string;
  minQuantity: string;
  percent: string;
}

export const MAX_TIERS = 5;
let nextKey = 1;
export const toTierForms = (tiers: BulkTier[]): TierForm[] => tiers.map((t) => ({ key: `t${nextKey++}`, minQuantity: String(t.minQuantity), percent: String(t.percent) }));
/** Empty rows are left out; anything else goes to the server, which explains mistakes. */
export const fromTierForms = (rows: TierForm[]): BulkTier[] =>
  rows
    .filter((r) => r.minQuantity.trim() || r.percent.trim())
    .map((r) => ({ minQuantity: Number(r.minQuantity.trim() || NaN), percent: Number(r.percent.replace('%', '').trim() || NaN) }));

const taka = (n: number) => `৳${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

/** "12 pieces of a ৳100 item: ৳1,140 instead of ৳1,200." For the first complete step. */
function example(rows: TierForm[]) {
  const t = fromTierForms(rows).find((x) => Number.isInteger(x.minQuantity) && x.minQuantity >= 2 && x.percent > 0 && x.percent <= 90);
  if (!t) return null;
  const full = t.minQuantity * 100;
  const off = Math.round((full * t.percent) / 100);
  return `Example: ${t.minQuantity} pieces of a ৳100 item cost ${taka(full - off)} instead of ${taka(full)}.`;
}

/** Steps like "From 10 pieces: 5% off". `errorAt(i, field)` gives the server's message for a row. */
export function BulkTiersEditor({
  value,
  onChange,
  errorAt,
  idPrefix,
}: {
  value: TierForm[];
  onChange: (rows: TierForm[]) => void;
  errorAt: (index: number, field: 'minQuantity' | 'percent') => string | undefined;
  idPrefix: string;
}) {
  const set = (key: string, patch: Partial<TierForm>) => onChange(value.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const hint = example(value);
  return (
    <div className="space-y-2">
      {value.length === 0 && <p className="text-sm text-zinc-500">No steps yet.</p>}
      {value.map((r, i) => {
        const qErr = errorAt(i, 'minQuantity');
        const pErr = errorAt(i, 'percent');
        return (
          <div key={r.key}>
            <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-700">
              <label htmlFor={`${idPrefix}-q-${i}`}>From</label>
              <AddonInput
                id={`${idPrefix}-q-${i}`}
                suffix="pieces"
                inputMode="numeric"
                value={r.minQuantity}
                onChange={(e) => set(r.key, { minQuantity: e.target.value })}
                invalid={!!qErr}
                className="w-36 pr-16"
                aria-label={`Step ${i + 1}: from how many pieces`}
              />
              <label htmlFor={`${idPrefix}-p-${i}`}>get</label>
              <AddonInput
                id={`${idPrefix}-p-${i}`}
                suffix="% off"
                inputMode="decimal"
                value={r.percent}
                onChange={(e) => set(r.key, { percent: e.target.value })}
                invalid={!!pErr}
                className="w-32 pr-14"
                aria-label={`Step ${i + 1}: percent off`}
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => onChange(value.filter((x) => x.key !== r.key))} aria-label={`Remove step ${i + 1}`}>
                <Trash2 />
              </Button>
            </div>
            {(qErr || pErr) && (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {qErr ?? pErr}
              </p>
            )}
          </div>
        );
      })}
      {value.length < MAX_TIERS && (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, { key: `t${nextKey++}`, minQuantity: '', percent: '' }])}>
          <Plus /> Add a step
        </Button>
      )}
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

/** "10+ pieces: 5% off · 50+: 10% off". */
export const describeTiers = (tiers: BulkTier[]) => tiers.map((t, i) => `${t.minQuantity}+${i === 0 ? ' pieces' : ''}: ${t.percent}% off`).join(' · ');
