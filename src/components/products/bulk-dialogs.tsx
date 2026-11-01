import { useMemo, useState, type FormEvent } from 'react';
import { useBrands, useCategories } from '@/hooks/use-catalog';
import type { BulkAction } from '@/hooks/use-products';
import type { Category } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { DialogBody, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/input';

/** Categories in tree order, with "└" marks for sub-categories. */
function useCategoryOptions(categories: Category[]) {
  return useMemo(() => {
    const byParent = new Map<number | null, Category[]>();
    for (const c of categories) byParent.set(c.parentId, [...(byParent.get(c.parentId) ?? []), c]);
    for (const list of byParent.values()) list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    const rows: { id: number; label: string }[] = [];
    const walk = (parentId: number | null, depth: number) => {
      for (const c of byParent.get(parentId) ?? []) {
        rows.push({ id: c.id, label: `${'    '.repeat(depth)}${depth ? '└ ' : ''}${c.name}` });
        walk(c.id, depth + 1);
      }
    };
    walk(null, 0);
    return rows;
  }, [categories]);
}

interface BulkDialogProps {
  count: number;
  loading: boolean;
  onApply: (action: BulkAction) => void;
  onCancel: () => void;
}

export function BulkCategoryDialog({ count, loading, onApply, onCancel }: BulkDialogProps) {
  const categories = useCategories();
  const options = useCategoryOptions(categories.data?.items ?? []);
  const [mode, setMode] = useState<'add-category' | 'remove-category'>('add-category');
  const [categoryId, setCategoryId] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (categoryId) onApply({ action: mode, categoryId: Number(categoryId) });
  };

  return (
    <DialogContent title={`Change category of ${count} product${count === 1 ? '' : 's'}`}>
      <form onSubmit={submit}>
        <DialogBody>
          <div className="flex rounded-lg bg-zinc-100 p-0.5" role="group" aria-label="Add or remove">
            {(['add-category', 'remove-category'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={
                  'flex-1 cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors ' +
                  (mode === m ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900')
                }
              >
                {m === 'add-category' ? 'Add to a category' : 'Remove from a category'}
              </button>
            ))}
          </div>
          <Field
            label="Category"
            htmlFor="bulk-category"
            hint={
              mode === 'add-category'
                ? 'Products keep their other categories. Products with no category get this as their main one.'
                : 'If it was a product’s main category, its next category becomes the main one.'
            }
          >
            <Select id="bulk-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} autoFocus>
              <option value="">Choose a category</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading} disabled={!categoryId}>
            {mode === 'add-category' ? 'Add' : 'Remove'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export function BulkBrandDialog({ count, loading, onApply, onCancel }: BulkDialogProps) {
  const brands = useBrands();
  const [brandId, setBrandId] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (brandId) onApply({ action: 'set-brand', brandId: brandId === 'none' ? null : Number(brandId) });
  };

  return (
    <DialogContent title={`Set the brand of ${count} product${count === 1 ? '' : 's'}`}>
      <form onSubmit={submit}>
        <DialogBody>
          <Field label="Brand" htmlFor="bulk-brand">
            <Select id="bulk-brand" value={brandId} onChange={(e) => setBrandId(e.target.value)} autoFocus>
              <option value="">Choose a brand</option>
              <option value="none">No brand</option>
              {brands.data?.items.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading} disabled={!brandId}>
            Set brand
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
