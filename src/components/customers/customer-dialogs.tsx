import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { useSaveAddress, useSaveCustomer, type CustomerInput } from '@/hooks/use-customers';
import { useBdLocations } from '@/hooks/use-settings';
import { ApiError, errorMessage } from '@/lib/api';
import type { Customer, CustomerAddress } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DialogBody, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { ErrorAlert, Spinner } from '@/components/ui/misc';

function errorsOf(error: unknown) {
  const fields = error instanceof ApiError ? error.fields : {};
  return { fields, general: error && !Object.keys(fields).length ? errorMessage(error) : null };
}

/** Add a customer, or change their details. */
export function CustomerDialog({ customer, onDone }: { customer: Customer | null; onDone: (saved?: Customer) => void }) {
  const save = useSaveCustomer();
  const [form, setForm] = useState({
    name: customer?.name ?? '',
    phone: customer?.phone ?? '',
    email: customer?.email ?? '',
    type: customer?.type ?? ('retail' as CustomerInput['type']),
    businessName: customer?.businessName ?? '',
    tradeLicense: customer?.tradeLicense ?? '',
    note: customer?.note ?? '',
  });
  const { fields, general } = errorsOf(save.error);
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });
  const existingId = fields.customerId;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const empty = (v: string) => v.trim() || null;
    save.mutate(
      {
        id: customer?.id,
        input: {
          name: form.name,
          phone: form.phone,
          email: empty(form.email),
          type: form.type,
          businessName: form.type === 'business' ? empty(form.businessName) : null,
          tradeLicense: form.type === 'business' ? empty(form.tradeLicense) : null,
          note: empty(form.note),
        },
      },
      {
        onSuccess: (saved) => {
          toast.success(customer ? 'Customer saved' : 'Customer added');
          onDone(saved);
        },
      },
    );
  };

  return (
    <DialogContent title={customer ? 'Edit customer' : 'Add a customer'} size="md">
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <DialogBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" htmlFor="customer-phone" required error={fields.phone}>
              <Input id="customer-phone" type="tel" value={form.phone} onChange={set('phone')} invalid={!!fields.phone} placeholder="01712345678" autoFocus />
            </Field>
            <Field label="Name" htmlFor="customer-name" required error={fields.name}>
              <Input id="customer-name" value={form.name} onChange={set('name')} invalid={!!fields.name} maxLength={100} />
            </Field>
          </div>
          {existingId && (
            <p className="text-sm">
              <Link to={`/customers/${existingId}`} className="text-brand-700 hover:underline" onClick={() => onDone()}>
                Open that customer
              </Link>
            </p>
          )}
          <Field label="Email" htmlFor="customer-email" error={fields.email}>
            <Input id="customer-email" type="email" value={form.email} onChange={set('email')} invalid={!!fields.email} />
          </Field>
          <Field
            label="Customer type"
            htmlFor="customer-type"
            hint={
              form.type === 'business'
                ? customer?.businessStatus === 'pending'
                  ? 'The request stays pending until you approve it.'
                  : 'Gets wholesale prices and the wholesale terms.'
                : undefined
            }
          >
            <Select id="customer-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as CustomerInput['type'] })}>
              <option value="retail">Retail</option>
              <option value="business">Business (wholesale)</option>
            </Select>
          </Field>
          {form.type === 'business' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Business name" htmlFor="customer-business" required error={fields.businessName}>
                <Input id="customer-business" value={form.businessName} onChange={set('businessName')} invalid={!!fields.businessName} maxLength={150} />
              </Field>
              <Field label="Trade licence no." htmlFor="customer-licence" error={fields.tradeLicense}>
                <Input id="customer-licence" value={form.tradeLicense} onChange={set('tradeLicense')} maxLength={60} />
              </Field>
            </div>
          )}
          <Field label="Staff note" htmlFor="customer-note" hint="Only staff see this">
            <Textarea id="customer-note" rows={2} value={form.note} onChange={set('note')} maxLength={2000} />
          </Field>
          {general && <ErrorAlert message={general} />}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onDone()} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending && <Spinner className="size-4 text-white" />}
            {customer ? 'Save' : 'Add customer'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

/** Add or change a saved address. */
export function AddressDialog({ customerId, address, onDone }: { customerId: number; address: CustomerAddress | null; onDone: () => void }) {
  const save = useSaveAddress(customerId);
  const places = useBdLocations();
  const [form, setForm] = useState({
    label: address?.label ?? '',
    recipientName: address?.recipientName ?? '',
    recipientPhone: address?.recipientPhone ?? '',
    districtId: address?.districtId ?? '',
    areaId: address?.areaId ?? '',
    address: address?.address ?? '',
    isDefault: address?.isDefault ?? false,
  });
  const { fields, general } = errorsOf(save.error);
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });
  const areas = useMemo(
    () =>
      (places.data?.areas ?? [])
        .filter((a) => a.districtId === form.districtId)
        .sort((x, y) => Number(y.city) - Number(x.city) || x.name.localeCompare(y.name)),
    [places.data, form.districtId],
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const empty = (v: string) => v.trim() || null;
    save.mutate(
      {
        id: address?.id,
        input: {
          label: empty(form.label),
          recipientName: empty(form.recipientName),
          recipientPhone: empty(form.recipientPhone),
          districtId: form.districtId,
          areaId: form.areaId || null,
          address: form.address,
          isDefault: form.isDefault,
        },
      },
      {
        onSuccess: () => {
          toast.success(address ? 'Address saved' : 'Address added');
          onDone();
        },
      },
    );
  };

  return (
    <DialogContent title={address ? 'Edit address' : 'Add an address'} size="md">
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <DialogBody className="space-y-4">
          <Field label="Label" htmlFor="address-label" hint="e.g. Home, Office, Shop">
            <Input id="address-label" value={form.label} onChange={set('label')} maxLength={40} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="District" htmlFor="address-district" required error={fields.districtId}>
              <Select
                id="address-district"
                value={form.districtId}
                onChange={(e) => setForm({ ...form, districtId: e.target.value, areaId: '' })}
                invalid={!!fields.districtId}
              >
                <option value="">Choose…</option>
                {places.data?.districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Area" htmlFor="address-area" error={fields.areaId}>
              <Select id="address-area" value={form.areaId} onChange={set('areaId')} disabled={!form.districtId}>
                <option value="">Choose…</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.city ? ' (Dhaka City)' : ''}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Address" htmlFor="address-text" required error={fields.address} hint="House, road, area, landmark">
            <Textarea id="address-text" rows={2} value={form.address} onChange={set('address')} invalid={!!fields.address} maxLength={500} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Receiver's name" htmlFor="address-recipient" hint="If someone else receives it">
              <Input id="address-recipient" value={form.recipientName} onChange={set('recipientName')} maxLength={100} />
            </Field>
            <Field label="Receiver's phone" htmlFor="address-recipient-phone" error={fields.recipientPhone}>
              <Input id="address-recipient-phone" type="tel" value={form.recipientPhone} onChange={set('recipientPhone')} invalid={!!fields.recipientPhone} />
            </Field>
          </div>
          {!address?.isDefault && (
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-700">
              <Checkbox checked={form.isDefault} onCheckedChange={(v) => setForm({ ...form, isDefault: v === true })} />
              Use for new orders (default address)
            </label>
          )}
          {general && <ErrorAlert message={general} />}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onDone} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending && <Spinner className="size-4 text-white" />}
            {address ? 'Save' : 'Add address'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
