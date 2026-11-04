import { useMemo, useState, type FormEvent } from 'react';
import { Calculator, Pencil, Plus, Trash2, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { useBdLocations, useDeleteZone, useDeliveryQuote, useDeliveryZones, useSaveZone } from '@/hooks/use-settings';
import { errorMessage } from '@/lib/api';
import type { BdLocations, DeliveryZone } from '@/lib/types';
import { cn, formatMoney } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogBody, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { AddonInput, Input, Select } from '@/components/ui/input';
import { ErrorAlert, LoadError, Skeleton, Spinner } from '@/components/ui/misc';
import { Switch } from '@/components/ui/switch';
import { PlacePicker, type Places } from './place-picker';
import { saveErrors, toNumber, toText } from './shared';

/** "Gazipur, Narayanganj + 5 areas". */
function coverage(zone: DeliveryZone, locations: BdLocations | undefined) {
  if (zone.isDefault && !zone.districtIds.length && !zone.areaIds.length) return 'Every place not in another zone';
  const names = zone.districtIds.map((id) => locations?.districts.find((d) => d.id === id)?.name ?? id);
  const areas = zone.areaIds.length;
  const parts = [
    names.length > 3 ? `${names.slice(0, 3).join(', ')} + ${names.length - 3} districts` : names.join(', '),
    areas ? `${areas} area${areas === 1 ? '' : 's'}` : '',
  ].filter(Boolean);
  return parts.join(' + ') || 'No places yet';
}

function chargeText(zone: DeliveryZone) {
  const parts = [formatMoney(zone.fee)];
  if (zone.extraPerKg !== null && zone.includedKg !== null) parts.push(`+ ${formatMoney(zone.extraPerKg)}/kg over ${zone.includedKg} kg`);
  return parts.join(' ');
}

export function DeliverySection() {
  const zones = useDeliveryZones();
  const locations = useBdLocations();
  const [editing, setEditing] = useState<DeliveryZone | 'new' | null>(null);
  const [deleting, setDeleting] = useState<DeliveryZone | null>(null);
  const remove = useDeleteZone();
  const items = zones.data?.items ?? [];

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Delivery zones</CardTitle>
            <CardDescription>
              An order uses the zone of its area, else the zone of its district, else the default zone.
            </CardDescription>
          </div>
          <Button onClick={() => setEditing('new')} disabled={!locations.data}>
            <Plus /> Add zone
          </Button>
        </CardHeader>
        {zones.isError ? (
          <LoadError message={errorMessage(zones.error)} onRetry={() => zones.refetch()} />
        ) : zones.isPending ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-y border-zinc-200 bg-zinc-50/70 text-left text-xs font-medium tracking-wide text-zinc-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Zone</th>
                  <th className="px-3 py-3">Charge</th>
                  <th className="hidden px-3 py-3 md:table-cell">Free from</th>
                  <th className="hidden px-3 py-3 sm:table-cell">Time</th>
                  <th className="w-24 px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {items.map((zone) => (
                  <tr key={zone.id} className={cn('hover:bg-zinc-50/70', !zone.isActive && 'opacity-60')}>
                    <td className="px-5 py-3">
                      <button type="button" onClick={() => setEditing(zone)} className="text-left">
                        <span className="flex items-center gap-2 font-medium text-zinc-900 hover:text-brand-700">
                          {zone.name}
                          {zone.isDefault && <Badge variant="blue">Default</Badge>}
                          {!zone.isActive && <Badge>Off</Badge>}
                        </span>
                        <span className="block text-xs text-zinc-500">{coverage(zone, locations.data)}</span>
                      </button>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-zinc-700">{chargeText(zone)}</td>
                    <td className="hidden px-3 py-3 text-zinc-600 md:table-cell">{zone.freeAbove === null ? '—' : formatMoney(zone.freeAbove)}</td>
                    <td className="hidden px-3 py-3 text-zinc-600 sm:table-cell">{zone.deliveryTime ?? '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditing(zone)} aria-label={`Edit ${zone.name}`}>
                          <Pencil />
                        </Button>
                        {!zone.isDefault && (
                          <Button variant="ghost" size="icon" onClick={() => setDeleting(zone)} aria-label={`Delete ${zone.name}`}>
                            <Trash2 />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <QuoteCard />

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        {editing !== null && locations.data && (
          <ZoneDialog
            zone={editing === 'new' ? null : editing}
            zones={items}
            locations={locations.data}
            onDone={() => setEditing(null)}
          />
        )}
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete "${deleting?.name}"?`}
        description="Its places will use the default zone."
        confirmLabel="Delete zone"
        danger
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(deleting!.id, {
            onSuccess: () => {
              toast.success('Zone deleted');
              setDeleting(null);
            },
            onError: (err) => toast.error(errorMessage(err)),
          })
        }
      />
    </div>
  );
}

function ZoneDialog({
  zone,
  zones,
  locations,
  onDone,
}: {
  zone: DeliveryZone | null;
  zones: DeliveryZone[];
  locations: BdLocations;
  onDone: () => void;
}) {
  const save = useSaveZone();
  const [form, setForm] = useState({
    name: zone?.name ?? '',
    fee: toText(zone?.fee),
    freeAbove: toText(zone?.freeAbove),
    includedKg: toText(zone?.includedKg),
    extraPerKg: toText(zone?.extraPerKg),
    deliveryTime: zone?.deliveryTime ?? '',
    isActive: zone?.isActive ?? true,
  });
  const [places, setPlaces] = useState<Places>({ districtIds: zone?.districtIds ?? [], areaIds: zone?.areaIds ?? [] });
  const { fields, general } = saveErrors(save.error);
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });

  // Places in other active zones.
  const taken = useMemo(() => {
    const map = new Map<string, string>();
    for (const z of zones) {
      if (z.id === zone?.id || !z.isActive) continue;
      for (const id of z.districtIds) map.set(`d:${id}`, z.name);
      for (const id of z.areaIds) map.set(`a:${id}`, z.name);
    }
    return map;
  }, [zones, zone]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(
      {
        id: zone?.id,
        input: {
          name: form.name,
          fee: toNumber(form.fee) ?? Number.NaN,
          freeAbove: toNumber(form.freeAbove),
          includedKg: toNumber(form.includedKg),
          extraPerKg: toNumber(form.extraPerKg),
          deliveryTime: form.deliveryTime.trim() || null,
          isActive: form.isActive,
          ...places,
        },
      },
      {
        onSuccess: () => {
          toast.success(zone ? 'Zone saved' : 'Zone added');
          onDone();
        },
      },
    );
  };

  return (
    <DialogContent
      title={zone ? `Edit ${zone.name}` : 'Add a delivery zone'}
      description={zone?.isDefault ? 'The default zone is used for every place that is not in another zone.' : undefined}
      size="lg"
    >
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <DialogBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="zone-name" error={fields.name} required>
              <Input id="zone-name" value={form.name} onChange={set('name')} invalid={!!fields.name} maxLength={60} placeholder="e.g. Chattogram City" />
            </Field>
            <Field label="Delivery time" htmlFor="zone-time" error={fields.deliveryTime} hint="Shown to customers">
              <Input id="zone-time" value={form.deliveryTime} onChange={set('deliveryTime')} maxLength={40} placeholder="e.g. 2–3 days" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Delivery charge" htmlFor="zone-fee" error={fields.fee} required>
              <AddonInput id="zone-fee" prefix="৳" inputMode="decimal" value={form.fee} onChange={set('fee')} invalid={!!fields.fee} />
            </Field>
            <Field label="Free delivery from" htmlFor="zone-free" error={fields.freeAbove} hint="Order amount. Empty = never free.">
              <AddonInput id="zone-free" prefix="৳" inputMode="decimal" value={form.freeAbove} onChange={set('freeAbove')} invalid={!!fields.freeAbove} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Weight included" htmlFor="zone-kg" error={fields.includedKg} hint="Empty = no weight charge">
              <AddonInput id="zone-kg" suffix="kg" inputMode="decimal" value={form.includedKg} onChange={set('includedKg')} invalid={!!fields.includedKg} />
            </Field>
            <Field label="Extra per kg above it" htmlFor="zone-extra" error={fields.extraPerKg} hint="For every started kg">
              <AddonInput id="zone-extra" prefix="৳" inputMode="decimal" value={form.extraPerKg} onChange={set('extraPerKg')} invalid={!!fields.extraPerKg} />
            </Field>
          </div>
          {!zone?.isDefault && (
            <>
              <div>
                <div className="mb-1.5 text-sm font-medium text-zinc-800">Places</div>
                <PlacePicker locations={locations} value={places} onChange={setPlaces} taken={taken} />
                {(fields.districtIds || fields.areaIds) && (
                  <p className="mt-1.5 text-sm text-red-600" role="alert">
                    {fields.districtIds ?? fields.areaIds}
                  </p>
                )}
              </div>
              <label className="flex cursor-pointer items-center gap-3 text-sm">
                <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} aria-label="Zone is on" />
                <span className="text-zinc-700">On (turned-off zones are not used)</span>
              </label>
            </>
          )}
          {general && <ErrorAlert message={general} />}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onDone} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending && <Spinner className="size-4 text-white" />}
            {zone ? 'Save zone' : 'Add zone'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function QuoteCard() {
  const locations = useBdLocations();
  const check = useDeliveryQuote();
  const [form, setForm] = useState({ districtId: '', areaId: '', subtotal: '1000', weightKg: '1', wholesale: false });
  const areas = (locations.data?.areas ?? [])
    .filter((a) => a.districtId === form.districtId)
    .sort((x, y) => Number(y.city) - Number(x.city) || x.name.localeCompare(y.name));
  const result = check.data;
  const { fields, general } = saveErrors(check.error);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    check.mutate({
      districtId: form.districtId,
      areaId: form.areaId || null,
      subtotal: toNumber(form.subtotal) ?? 0,
      weightKg: toNumber(form.weightKg) ?? 0,
      wholesale: form.wholesale,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="size-5 text-zinc-400" /> Check a delivery charge
        </CardTitle>
        <CardDescription>See what a customer would pay, with the saved zones and wholesale terms.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_140px_120px_auto]">
          <Field label="District" htmlFor="quote-district" error={fields.districtId}>
            <Select
              id="quote-district"
              value={form.districtId}
              onChange={(e) => setForm({ ...form, districtId: e.target.value, areaId: '' })}
              invalid={!!fields.districtId}
            >
              <option value="">Choose…</option>
              {locations.data?.districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Area" htmlFor="quote-area" error={fields.areaId}>
            <Select id="quote-area" value={form.areaId} onChange={(e) => setForm({ ...form, areaId: e.target.value })} disabled={!form.districtId}>
              <option value="">Any area</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.city ? ' (Dhaka City)' : ''}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Order amount" htmlFor="quote-amount">
            <AddonInput id="quote-amount" prefix="৳" inputMode="decimal" value={form.subtotal} onChange={(e) => setForm({ ...form, subtotal: e.target.value })} />
          </Field>
          <Field label="Weight" htmlFor="quote-weight">
            <AddonInput id="quote-weight" suffix="kg" inputMode="decimal" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
          </Field>
          <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-1">
            <label className="flex h-10 cursor-pointer items-center gap-2 text-sm whitespace-nowrap text-zinc-700">
              <Checkbox checked={form.wholesale} onCheckedChange={(v) => setForm({ ...form, wholesale: v === true })} />
              Wholesale
            </label>
            <Button type="submit" variant="outline" disabled={check.isPending}>
              {check.isPending ? <Spinner className="size-4" /> : <Truck />}
              Check
            </Button>
          </div>
        </form>
        {general && <ErrorAlert message={general} className="mt-4" />}
        {result && !check.isPending && (
          <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50/50 px-4 py-3 text-sm" aria-live="polite">
            {result.zone === null ? (
              <p className="text-red-700">{result.note}</p>
            ) : (
              <>
                <p className="text-zinc-800">
                  <span className="text-lg font-semibold text-zinc-900">{result.fee === 0 ? 'Free' : formatMoney(result.fee)}</span>
                  <span className="text-zinc-500"> · {result.zone.name}</span>
                  {result.zone.deliveryTime && <span className="text-zinc-500"> · {result.zone.deliveryTime}</span>}
                </p>
                <p className="mt-0.5 text-zinc-600">
                  {result.free
                    ? result.note
                    : `Charge ${formatMoney(result.baseFee)}${result.weightFee ? ` + weight ${formatMoney(result.weightFee)} (${result.note})` : ''}`}
                  {!result.free && result.note && !result.weightFee && ` · ${result.note}`}
                </p>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
