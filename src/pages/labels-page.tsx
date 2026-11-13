import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Pencil, Plus, Tag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { LABEL_COLORS, LABEL_STYLE, useDeleteLabel, useLabels, useSaveLabel, type Label, type LabelColor } from '@/hooks/use-labels';
import { ApiError, errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { LabelBadge } from '@/components/catalog/label-badge';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogBody, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { EmptyState, ErrorAlert, LoadError, Skeleton, Spinner } from '@/components/ui/misc';
import { SwitchField } from '@/components/ui/switch';

const COLOR_NAME: Record<LabelColor, string> = {
  green: 'Green',
  blue: 'Blue',
  amber: 'Yellow',
  red: 'Red',
  purple: 'Purple',
  pink: 'Pink',
  gray: 'Grey',
  black: 'Black',
};

/** Products → Tags: badges like "Overseas" on the website, with a filter on product lists. */
export function LabelsPage() {
  const labels = useLabels();
  const remove = useDeleteLabel();
  const [editing, setEditing] = useState<Label | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<Label | null>(null);
  const items = labels.data?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Tags"
        description="Badges on the website, like “Overseas” or “Imported”. Shoppers can filter product lists by them. Add a tag to products on their page, or to many at once from the product list."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus /> New tag
          </Button>
        }
      />
      <Card className="overflow-hidden">
        {labels.isError ? (
          <LoadError message={errorMessage(labels.error)} onRetry={() => labels.refetch()} />
        ) : !labels.isPending && items.length === 0 ? (
          <EmptyState
            icon={<Tag />}
            title="No tags yet"
            description="For example: Overseas, Imported, Best for school, Eco-friendly."
            action={
              <Button onClick={() => setEditing('new')}>
                <Plus /> New tag
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 text-left text-xs font-medium tracking-wide text-zinc-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Tag</th>
                  <th className="px-5 py-3">Products</th>
                  <th className="px-5 py-3">On the website</th>
                  <th className="w-24 px-5 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {labels.isPending
                  ? Array.from({ length: 3 }, (_, i) => (
                      <tr key={i}>
                        <td className="px-5 py-4" colSpan={4}>
                          <Skeleton className="h-5 w-48" />
                        </td>
                      </tr>
                    ))
                  : items.map((l) => (
                      <tr key={l.id} className={l.isActive ? 'hover:bg-zinc-50/60' : 'bg-zinc-50/50'}>
                        <td className="px-5 py-3">
                          <button type="button" onClick={() => setEditing(l)} className="flex cursor-pointer items-center gap-3 text-left">
                            <LabelBadge name={l.name} color={l.color} />
                            <span className="text-xs text-zinc-400">?tag={l.slug}</span>
                          </button>
                        </td>
                        <td className="px-5 py-3">
                          {l.productCount > 0 ? (
                            <Link to={`/products?label=${l.id}`} className="font-medium text-brand-700 hover:underline">
                              {l.productCount}
                            </Link>
                          ) : (
                            <span className="text-zinc-400">0</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {l.isActive ? <Badge variant="green">Shown</Badge> : <Badge>Hidden</Badge>}
                            {l.isActive && !l.showOnCards && <Badge variant="gray">Product page only</Badge>}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setEditing(l)} aria-label={`Change ${l.name}`}>
                              <Pencil />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setToDelete(l)} aria-label={`Delete ${l.name}`}>
                              <Trash2 />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        {editing && <LabelDialog label={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />}
      </Dialog>
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Delete “${toDelete?.name}”?`}
        description={toDelete?.productCount ? `It comes off ${toDelete.productCount} product${toDelete.productCount === 1 ? '' : 's'}. The products stay.` : 'No product has it.'}
        confirmLabel="Delete"
        danger
        loading={remove.isPending}
        onConfirm={() =>
          toDelete &&
          remove.mutate(toDelete.id, {
            onSuccess: () => {
              toast.success(`“${toDelete.name}” deleted`);
              setToDelete(null);
            },
            onError: (err) => toast.error(errorMessage(err)),
          })
        }
      />
    </div>
  );
}

function LabelDialog({ label, onDone }: { label: Label | null; onDone: () => void }) {
  const save = useSaveLabel();
  const [name, setName] = useState(label?.name ?? '');
  const [color, setColor] = useState<LabelColor>(label?.color ?? 'green');
  const [showOnCards, setShowOnCards] = useState(label?.showOnCards ?? true);
  const [isActive, setIsActive] = useState(label?.isActive ?? true);
  const [sortOrder, setSortOrder] = useState(String(label?.sortOrder ?? 0));
  const fields = save.error instanceof ApiError ? save.error.fields : {};
  const general = save.error && !Object.keys(fields).length ? errorMessage(save.error) : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(
      { id: label?.id, input: { name: name.trim(), color, showOnCards, isActive, sortOrder: Number(sortOrder) || 0 } },
      {
        onSuccess: (saved) => {
          toast.success(label ? `“${saved.name}” saved` : `“${saved.name}” added`);
          onDone();
        },
      },
    );
  };

  return (
    <DialogContent title={label ? 'Change tag' : 'New tag'} description="Shown as a badge on the website." size="sm">
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <DialogBody className="space-y-4">
          <Field label="Name" htmlFor="label-name" required error={fields.name ?? fields.slug}>
            <Input id="label-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} placeholder="Overseas" autoFocus />
          </Field>
          <Field label="Colour" htmlFor="label-color">
            <div id="label-color" className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
              {LABEL_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={color === c}
                  aria-label={COLOR_NAME[c]}
                  onClick={() => setColor(c)}
                  className={cn('cursor-pointer rounded-md px-2 py-1 text-xs font-bold uppercase ring-offset-2', LABEL_STYLE[c], color === c && 'ring-2 ring-brand-600')}
                >
                  {COLOR_NAME[c]}
                </button>
              ))}
            </div>
          </Field>
          <div className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2.5 text-sm text-zinc-600">
            Preview: <LabelBadge name={name.trim() || 'Tag'} color={color} />
          </div>
          <SwitchField id="label-cards" label="Show on product cards" description="Off: only on the product page and in the filter." checked={showOnCards} onCheckedChange={setShowOnCards} />
          <SwitchField id="label-active" label="Shown on the website" description="Off: hidden everywhere, but kept on the products." checked={isActive} onCheckedChange={setIsActive} />
          <Field label="Order" htmlFor="label-order" hint="Smaller numbers come first when a product has several tags.">
            <Input id="label-order" inputMode="numeric" value={sortOrder} onChange={(e) => setSortOrder(e.target.value.replace(/\D/g, ''))} className="w-24" />
          </Field>
          {general && <ErrorAlert message={general} />}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onDone} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending || !name.trim()}>
            {save.isPending && <Spinner className="size-4 text-white" />}
            {label ? 'Save' : 'Add tag'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
