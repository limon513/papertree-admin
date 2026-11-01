import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useProduct, useStockLocations, useUpdateStock, type StockChange } from '@/hooks/use-products';
import { ApiError, errorMessage } from '@/lib/api';
import type { Product, ProductVariant, StockLocation } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DialogBody, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ErrorAlert, LoadError, Skeleton } from '@/components/ui/misc';

const key = (variantId: number, locationId: number) => `${variantId}:${locationId}`;
const quantityAt = (v: ProductVariant, locationId: number) => v.stock.find((s) => s.locationId === locationId)?.quantity ?? 0;

/** Change the stock of a product's variants without opening the full form. */
export function QuickStockDialog({ productId, onDone }: { productId: number; onDone: () => void }) {
  const product = useProduct(productId, { fresh: true });
  const locations = useStockLocations();

  return (
    <DialogContent size="lg" title={product.data ? `Stock: ${product.data.name}` : 'Stock'}>
      {product.isError || locations.isError ? (
        <LoadError
          message={errorMessage(product.error ?? locations.error)}
          onRetry={() => {
            void product.refetch();
            void locations.refetch();
          }}
        />
      ) : !product.data || !product.isFetchedAfterMount || !locations.data ? (
        // Wait for fresh numbers: cached ones may be out of date.
        <DialogBody>
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </DialogBody>
      ) : (
        <StockForm product={product.data} locations={locations.data.items} onDone={onDone} />
      )}
    </DialogContent>
  );
}

function StockForm({ product, locations, onDone }: { product: Product; locations: StockLocation[]; onDone: () => void }) {
  const update = useUpdateStock();
  const tracked = product.variants.filter((v) => v.trackStock);
  /** The numbers shown when the window opened. Only the difference from these is saved. */
  const [base] = useState<Record<string, number>>(() =>
    Object.fromEntries(tracked.flatMap((v) => locations.map((l) => [key(v.id, l.id), quantityAt(v, l.id)]))),
  );
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(base).map(([k, q]) => [k, String(q)])),
  );
  const [note, setNote] = useState('');
  const [invalid, setInvalid] = useState<Set<string>>(new Set());

  const label = (v: ProductVariant) =>
    [v.option1, v.option2, v.option3].filter(Boolean).join(' / ') || (product.variants.length === 1 ? 'Stock' : 'Variant');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const bad = new Set<string>();
    const changes: StockChange[] = [];
    for (const v of tracked) {
      for (const l of locations) {
        const k = key(v.id, l.id);
        const typed = (values[k] ?? '').trim();
        const quantity = Number(typed);
        if (typed === '' || !Number.isInteger(quantity)) {
          bad.add(k);
          continue;
        }
        const shown = base[k] ?? 0;
        if (quantity !== shown) changes.push({ variantId: v.id, locationId: l.id, quantity, baseQuantity: shown });
      }
    }
    setInvalid(bad);
    if (bad.size) return;
    if (!changes.length) return onDone();

    update.mutate(
      { changes, note: note.trim() || null },
      {
        onSuccess: () => {
          toast.success(`Stock updated for ${product.name}`);
          onDone();
        },
      },
    );
  };

  const generalError = update.isError
    ? update.error instanceof ApiError && Object.keys(update.error.fields).length
      ? 'Please check the numbers.'
      : errorMessage(update.error)
    : null;

  if (tracked.length === 0) {
    return (
      <>
        <DialogBody>
          <p className="text-sm text-zinc-600">
            This product does not track stock. Turn on "Track stock" in the product form to count it.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button type="button" onClick={onDone}>
            Close
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <DialogBody>
        {generalError && <ErrorAlert message={generalError} />}
        <div className="overflow-hidden rounded-lg border border-zinc-200">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50/70 text-left text-xs font-medium text-zinc-500">
              <tr>
                <th className="px-3 py-2">{product.variants.length > 1 ? 'Variant' : ''}</th>
                {locations.map((l) => (
                  <th key={l.id} className="w-32 px-3 py-2">
                    {locations.length > 1 ? l.name : 'In stock'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {tracked.map((v) => {
                const total = locations.reduce((sum, l) => sum + (Number(values[key(v.id, l.id)]) || 0), 0);
                const status =
                  total <= 0 ? 'Out of stock' : v.lowStockThreshold !== null && total <= v.lowStockThreshold ? 'Low' : null;
                return (
                  <tr key={v.id}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-zinc-900">{label(v)}</div>
                      <div className="flex gap-2 text-xs text-zinc-500">
                        {v.sku && <span>{v.sku}</span>}
                        {status && <span className={total <= 0 ? 'text-red-600' : 'text-amber-700'}>{status}</span>}
                      </div>
                    </td>
                    {locations.map((l) => {
                      const k = key(v.id, l.id);
                      return (
                        <td key={l.id} className="px-3 py-2">
                          <Input
                            inputMode="numeric"
                            value={values[k] ?? ''}
                            onChange={(e) => setValues((prev) => ({ ...prev, [k]: e.target.value }))}
                            onFocus={(e) => e.target.select()}
                            invalid={invalid.has(k)}
                            className={cn('h-9', values[k] !== String(base[k] ?? 0) && 'border-brand-400 bg-brand-50/40')}
                            aria-label={`Stock for ${label(v)}${locations.length > 1 ? ` at ${l.name}` : ''}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {invalid.size > 0 && <p className="text-sm text-red-600">Enter whole numbers in the highlighted boxes.</p>}
        <Field label="Note" htmlFor="stock-note" hint="Optional. Saved in the stock history, e.g. “Delivery from supplier”.">
          <Input id="stock-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
        </Field>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={update.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={update.isPending}>
          Save stock
        </Button>
      </DialogFooter>
    </form>
  );
}
