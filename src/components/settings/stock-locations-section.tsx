import { useState, type FormEvent } from 'react';
import { MoreHorizontal, Plus, Warehouse } from 'lucide-react';
import { toast } from 'sonner';
import {
  useDeleteStockLocation,
  useMakeDefaultLocation,
  useSaveStockLocation,
  useStockLocationRows,
} from '@/hooks/use-settings';
import { errorMessage } from '@/lib/api';
import type { StockLocationRow } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogBody, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { LoadError, Skeleton, Spinner } from '@/components/ui/misc';
import { saveErrors } from './shared';

const units = new Intl.NumberFormat('en-US');

export function StockLocationsSection() {
  const rows = useStockLocationRows();
  const save = useSaveStockLocation();
  const makeDefault = useMakeDefaultLocation();
  const remove = useDeleteStockLocation();
  const [editing, setEditing] = useState<StockLocationRow | 'new' | null>(null);
  const [deleting, setDeleting] = useState<StockLocationRow | null>(null);

  const toggle = (row: StockLocationRow) =>
    save.mutate(
      { id: row.id, input: { name: row.name, isActive: !row.isActive } },
      {
        onSuccess: () => toast.success(row.isActive ? `${row.name} turned off` : `${row.name} turned on`),
        onError: (err) => toast.error(errorMessage(err)),
      },
    );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>Stock locations</CardTitle>
          <CardDescription>
            Warehouses and shops that keep stock. New products, imports and orders use the default location.
          </CardDescription>
        </div>
        <Button onClick={() => setEditing('new')}>
          <Plus /> Add location
        </Button>
      </CardHeader>
      {rows.isError ? (
        <LoadError message={errorMessage(rows.error)} onRetry={() => rows.refetch()} />
      ) : rows.isPending ? (
        <div className="space-y-3 p-5">
          <Skeleton className="h-12" />
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100 border-t border-zinc-200">
          {rows.data.items.map((row) => (
            <li key={row.id} className={cn('flex items-center gap-3 px-5 py-3', !row.isActive && 'opacity-60')}>
              <Warehouse className="size-5 shrink-0 text-zinc-400" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 font-medium text-zinc-900">
                  {row.name}
                  {row.isDefault && <Badge variant="blue">Default</Badge>}
                  {!row.isActive && <Badge>Off</Badge>}
                </div>
                <div className="text-xs text-zinc-500">{units.format(row.units)} units in stock</div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={`Actions for ${row.name}`}>
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setEditing(row)}>Rename</DropdownMenuItem>
                  {!row.isDefault && row.isActive && (
                    <DropdownMenuItem
                      onSelect={() =>
                        makeDefault.mutate(row.id, {
                          onSuccess: () => toast.success(`${row.name} is now the default`),
                          onError: (err) => toast.error(errorMessage(err)),
                        })
                      }
                    >
                      Make default
                    </DropdownMenuItem>
                  )}
                  {!row.isDefault && <DropdownMenuItem onSelect={() => toggle(row)}>{row.isActive ? 'Turn off' : 'Turn on'}</DropdownMenuItem>}
                  {!row.isDefault && (
                    <DropdownMenuItem danger onSelect={() => setDeleting(row)}>
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        {editing !== null && <LocationDialog row={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />}
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete "${deleting?.name}"?`}
        description="Only a location that never had stock can be deleted. Otherwise turn it off."
        confirmLabel="Delete location"
        danger
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(deleting!.id, {
            onSuccess: () => {
              toast.success('Location deleted');
              setDeleting(null);
            },
            onError: (err) => {
              toast.error(errorMessage(err));
              setDeleting(null);
            },
          })
        }
      />
    </Card>
  );
}

function LocationDialog({ row, onDone }: { row: StockLocationRow | null; onDone: () => void }) {
  const save = useSaveStockLocation();
  const [name, setName] = useState(row?.name ?? '');
  const { fields, general } = saveErrors(save.error);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(
      { id: row?.id, input: { name, isActive: row?.isActive ?? true } },
      {
        onSuccess: () => {
          toast.success(row ? 'Location renamed' : 'Location added');
          onDone();
        },
      },
    );
  };

  return (
    <DialogContent title={row ? `Rename ${row.name}` : 'Add a stock location'} size="sm">
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <DialogBody>
          <Field label="Name" htmlFor="location-name" error={fields.name ?? general ?? undefined} required>
            <Input
              id="location-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              invalid={!!(fields.name || general)}
              maxLength={60}
              placeholder="e.g. Mirpur shop"
              autoFocus
            />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onDone} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending && <Spinner className="size-4 text-white" />}
            {row ? 'Save' : 'Add location'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
