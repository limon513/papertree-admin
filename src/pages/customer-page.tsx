import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Ban, Building2, MapPin, MoreHorizontal, Pencil, Phone, Plus, ShoppingCart, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useCustomer, useDeleteAddress, useSaveAddress, useSetBlocked, useSetBusiness } from '@/hooks/use-customers';
import { ApiError, errorMessage } from '@/lib/api';
import type { Customer, CustomerAddress, WholesaleDelivery } from '@/lib/types';
import { cn, formatDateTime, formatMoney, timeAgo } from '@/lib/utils';
import { CustomerBadges } from '@/components/customers/customer-badges';
import { AddressDialog, CustomerDialog } from '@/components/customers/customer-dialogs';
import { orderNo, OrderStatusBadge, PaymentBadge } from '@/components/orders/labels';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogBody, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Field } from '@/components/ui/field';
import { AddonInput, Input, Select, Textarea } from '@/components/ui/input';
import { ErrorAlert, LoadError, Skeleton, Spinner } from '@/components/ui/misc';

export function CustomerPage() {
  const id = Number(useParams().id);
  const customer = useCustomer(id);
  const [editing, setEditing] = useState(false);
  const [blocking, setBlocking] = useState(false);

  if (customer.isError) return <LoadError message={errorMessage(customer.error)} onRetry={() => customer.refetch()} />;
  if (customer.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-28" />
        <Skeleton className="h-80" />
      </div>
    );
  }
  const c = customer.data;
  const isBusiness = c.type === 'business' && c.businessStatus === 'approved';

  return (
    <div className="space-y-6">
      <div>
        <Link to="/customers" className="mb-1 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800">
          <ArrowLeft className="size-4" /> Customers
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{isBusiness && c.businessName ? c.businessName : c.name}</h1>
              <CustomerBadges customer={c} />
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500">
              {isBusiness && c.businessName && c.businessName !== c.name && <span>{c.name}</span>}
              <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 text-brand-700 hover:underline">
                <Phone className="size-3.5" /> {c.phone}
              </a>
              {c.email && <span>{c.email}</span>}
              <span>Customer since {formatDateTime(c.createdAt).split(',')[0]}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil /> Edit details
            </Button>
            <Button variant="outline" onClick={() => setBlocking(true)}>
              <Ban /> {c.isBlocked ? 'Unblock' : 'Block'}
            </Button>
            <Button asChild>
              <Link to={`/orders/new?phone=${c.phone}`}>
                <ShoppingCart /> New order
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {c.isBlocked && (
        <div className="flex gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <Ban className="mt-0.5 size-4 shrink-0" />
          <span>
            <span className="font-medium">Blocked: </span>
            {c.blockedReason}. They cannot order on the website, and staff see a warning when they take an order.
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Orders" value={String(c.stats.orders)} note={c.stats.cancelled ? `${c.stats.cancelled} cancelled` : undefined} />
        <Stat label="Spent" value={formatMoney(c.stats.spent)} note="Delivered orders" />
        <Stat label="Average order" value={c.stats.averageOrder ? formatMoney(c.stats.averageOrder) : '—'} />
        <Stat label="Still owed" value={c.stats.due ? formatMoney(c.stats.due) : '—'} tone={c.stats.due ? 'red' : undefined} />
        <Stat
          label="Last order"
          value={c.stats.lastOrderAt ? timeAgo(c.stats.lastOrderAt) : 'Never'}
          note={c.stats.returned ? `${c.stats.returned} returned` : undefined}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <OrdersCard customer={c} />
          <AddressesCard customer={c} />
        </div>
        <div className="space-y-6">
          <BusinessCard customer={c} onEdit={() => setEditing(true)} />
          {c.note && (
            <Card>
              <CardHeader>
                <CardTitle>Staff note</CardTitle>
              </CardHeader>
              <CardContent className="text-sm whitespace-pre-line text-zinc-700">{c.note}</CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        {editing && <CustomerDialog customer={c} onDone={() => setEditing(false)} />}
      </Dialog>
      <Dialog open={blocking} onOpenChange={setBlocking}>
        {blocking && <BlockDialog customer={c} onDone={() => setBlocking(false)} />}
      </Dialog>
    </div>
  );
}

function Stat({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: 'red' }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs font-medium tracking-wide text-zinc-500 uppercase">{label}</div>
        <div className={cn('mt-1 text-xl font-semibold tabular-nums', tone === 'red' ? 'text-red-700' : 'text-zinc-900')}>{value}</div>
        {note && <div className="text-xs text-zinc-500">{note}</div>}
      </CardContent>
    </Card>
  );
}

function OrdersCard({ customer }: { customer: Customer }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Orders</CardTitle>
      </CardHeader>
      {customer.orders.length === 0 ? (
        <CardContent className="text-sm text-zinc-500">No orders yet.</CardContent>
      ) : (
        <div className="overflow-x-auto border-t border-zinc-200">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-zinc-100">
              {customer.orders.map((o) => (
                <tr key={o.id} className="hover:bg-zinc-50/70">
                  <td className="px-5 py-3">
                    <Link to={`/orders/${o.id}`} className="font-medium text-zinc-900 hover:text-brand-700">
                      {orderNo(o.number)}
                    </Link>
                    <div className="text-xs text-zinc-500">
                      {formatDateTime(o.createdAt)}
                      {o.type === 'wholesale' && ' · wholesale'}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="hidden px-3 py-3 sm:table-cell">
                    <PaymentBadge status={o.paymentStatus} />
                  </td>
                  <td className="px-5 py-3 text-right font-medium tabular-nums">{formatMoney(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function AddressesCard({ customer }: { customer: Customer }) {
  const [editing, setEditing] = useState<CustomerAddress | 'new' | null>(null);
  const [deleting, setDeleting] = useState<CustomerAddress | null>(null);
  const remove = useDeleteAddress(customer.id);
  const save = useSaveAddress(customer.id);

  const makeDefault = (a: CustomerAddress) =>
    save.mutate(
      {
        id: a.id,
        input: {
          label: a.label,
          recipientName: a.recipientName,
          recipientPhone: a.recipientPhone,
          districtId: a.districtId,
          areaId: a.areaId,
          address: a.address,
          isDefault: true,
        },
      },
      { onSuccess: () => toast.success('Default address changed'), onError: (err) => toast.error(errorMessage(err)) },
    );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Addresses</CardTitle>
          <CardDescription>New orders start with the default address. Addresses used on orders are saved here.</CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={() => setEditing('new')}>
          <Plus /> Add
        </Button>
      </CardHeader>
      <CardContent>
        {customer.addresses.length === 0 ? (
          <p className="text-sm text-zinc-500">No saved addresses.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {customer.addresses.map((a) => (
              <li key={a.id} className={cn('rounded-lg border p-3 text-sm', a.isDefault ? 'border-brand-300 bg-brand-50/40' : 'border-zinc-200')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-medium text-zinc-900">
                    <MapPin className="size-3.5 text-zinc-400" />
                    {a.label ?? 'Address'}
                    {a.isDefault && <span className="text-xs font-normal text-brand-700">· default</span>}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="-mt-1 -mr-1 size-7" aria-label={`Actions for ${a.label ?? 'address'}`}>
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onSelect={() => setEditing(a)}>Edit</DropdownMenuItem>
                      {!a.isDefault && (
                        <DropdownMenuItem onSelect={() => makeDefault(a)}>
                          <Star /> Make default
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem danger onSelect={() => setDeleting(a)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="mt-1 text-zinc-700">{a.address}</p>
                <p className="text-zinc-500">{[a.areaName, a.districtName].filter(Boolean).join(', ')}</p>
                {(a.recipientName || a.recipientPhone) && (
                  <p className="mt-1 text-xs text-zinc-500">Receiver: {[a.recipientName, a.recipientPhone].filter(Boolean).join(' · ')}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        {editing !== null && <AddressDialog customerId={customer.id} address={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />}
      </Dialog>
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this address?"
        description={deleting?.address ?? ''}
        confirmLabel="Delete address"
        danger
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(deleting!.id, {
            onSuccess: () => {
              toast.success('Address deleted');
              setDeleting(null);
            },
            onError: (err) => toast.error(errorMessage(err)),
          })
        }
      />
    </Card>
  );
}

const DELIVERY_RULES: { value: WholesaleDelivery | ''; label: string }[] = [
  { value: '', label: 'Shop terms' },
  { value: 'retail', label: 'Same as retail orders' },
  { value: 'fixed', label: 'A fixed charge' },
  { value: 'free', label: 'Free delivery' },
  { value: 'paid_on_delivery', label: 'Customer pays the courier' },
];

const text = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n));
const numberOrNull = (t: string) => (t.trim() === '' ? null : Number(t));

function BusinessCard({ customer, onEdit }: { customer: Customer; onEdit: () => void }) {
  const setBusiness = useSetBusiness(customer.id);
  const terms = customer.wholesaleTerms;
  const [form, setForm] = useState({
    advance: text(terms?.advancePercent),
    minOrder: text(terms?.minOrderAmount),
    delivery: (terms?.delivery ?? '') as WholesaleDelivery | '',
    fee: text(terms?.deliveryFee),
    note: terms?.note ?? '',
  });
  const fields = setBusiness.error instanceof ApiError ? setBusiness.error.fields : {};
  const general = setBusiness.error && !Object.keys(fields).length ? errorMessage(setBusiness.error) : null;

  const decide = (status: 'approved' | 'rejected') =>
    setBusiness.mutate(
      { status, terms: customer.wholesaleTerms },
      { onSuccess: () => toast.success(status === 'approved' ? 'Business approved' : 'Business request rejected') },
    );

  const saveTerms = (e: FormEvent) => {
    e.preventDefault();
    setBusiness.mutate(
      {
        status: 'approved',
        terms: {
          advancePercent: numberOrNull(form.advance),
          minOrderAmount: numberOrNull(form.minOrder),
          delivery: form.delivery || null,
          deliveryFee: form.delivery === 'fixed' ? numberOrNull(form.fee) : null,
          note: form.note.trim() || null,
        },
      },
      { onSuccess: () => toast.success('Terms saved') },
    );
  };

  const status = customer.businessStatus;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="size-5 text-zinc-400" /> Business account
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {status === null && customer.type === 'retail' && (
          <>
            <p className="text-zinc-600">A retail customer. Make them a business to give wholesale prices and terms.</p>
            <Button variant="outline" size="sm" onClick={onEdit}>
              Make a business
            </Button>
          </>
        )}

        {status === 'pending' && (
          <>
            <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-900">
              Asked for a business account{customer.businessName ? ` for ${customer.businessName}` : ''}. Approve to give wholesale prices.
            </p>
            {customer.tradeLicense && <p className="text-zinc-600">Trade licence: {customer.tradeLicense}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={() => decide('approved')} disabled={setBusiness.isPending}>
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => decide('rejected')} disabled={setBusiness.isPending}>
                Reject
              </Button>
            </div>
          </>
        )}

        {status === 'rejected' && (
          <>
            <p className="text-zinc-600">The business request was rejected. They buy at retail prices.</p>
            <Button size="sm" variant="outline" onClick={() => decide('approved')} disabled={setBusiness.isPending}>
              Approve after all
            </Button>
          </>
        )}

        {status === 'approved' && (
          <form onSubmit={saveTerms} className="space-y-4">
            <p className="text-zinc-600">
              Wholesale prices on wholesale orders. Their own terms below replace the shop terms; empty fields keep the shop terms.
            </p>
            {customer.tradeLicense && <p className="text-zinc-600">Trade licence: {customer.tradeLicense}</p>}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Advance" htmlFor="terms-advance" error={fields['terms.advancePercent']}>
                <AddonInput id="terms-advance" suffix="%" inputMode="decimal" placeholder="Shop" value={form.advance} onChange={(e) => setForm({ ...form, advance: e.target.value })} />
              </Field>
              <Field label="Minimum order" htmlFor="terms-min" error={fields['terms.minOrderAmount']}>
                <AddonInput id="terms-min" prefix="৳" inputMode="decimal" placeholder="Shop" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} />
              </Field>
            </div>
            <Field label="Delivery charge" htmlFor="terms-delivery">
              <Select id="terms-delivery" value={form.delivery} onChange={(e) => setForm({ ...form, delivery: e.target.value as WholesaleDelivery | '' })}>
                {DELIVERY_RULES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </Field>
            {form.delivery === 'fixed' && (
              <Field label="Fixed charge" htmlFor="terms-fee" required error={fields['terms.deliveryFee']}>
                <AddonInput id="terms-fee" prefix="৳" inputMode="decimal" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} />
              </Field>
            )}
            <Field label="Note for staff" htmlFor="terms-note" hint="Shown when taking their orders, e.g. “pays by bank within 7 days”">
              <Textarea id="terms-note" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={1000} />
            </Field>
            {general && <ErrorAlert message={general} />}
            <div className="flex flex-wrap justify-between gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => decide('rejected')} disabled={setBusiness.isPending}>
                Remove business access
              </Button>
              <Button type="submit" size="sm" disabled={setBusiness.isPending}>
                {setBusiness.isPending && <Spinner className="size-4 text-white" />}
                Save terms
              </Button>
            </div>
          </form>
        )}
        {status !== 'approved' && general && <ErrorAlert message={general} />}
      </CardContent>
    </Card>
  );
}

function BlockDialog({ customer, onDone }: { customer: Customer; onDone: () => void }) {
  const setBlocked = useSetBlocked(customer.id);
  const [reason, setReason] = useState('');
  const fields = setBlocked.error instanceof ApiError ? setBlocked.error.fields : {};
  const block = !customer.isBlocked;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setBlocked.mutate(
      { blocked: block, reason: block ? reason.trim() || null : null },
      {
        onSuccess: () => {
          toast.success(block ? 'Customer blocked' : 'Customer unblocked');
          onDone();
        },
      },
    );
  };

  return (
    <DialogContent
      title={block ? `Block ${customer.name}?` : `Unblock ${customer.name}?`}
      description={block ? 'They will not be able to order on the website. Staff can still take their orders, with a warning.' : 'They can order again.'}
      size="sm"
    >
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <DialogBody>
          {block ? (
            <Field label="Why?" htmlFor="block-reason" required error={fields.reason} hint="So other staff know">
              <Input id="block-reason" value={reason} onChange={(e) => setReason(e.target.value)} invalid={!!fields.reason} maxLength={500} placeholder="e.g. Refused 3 cash-on-delivery parcels" autoFocus />
            </Field>
          ) : (
            <p className="text-sm text-zinc-600">Blocked because: {customer.blockedReason}</p>
          )}
          {setBlocked.error && !fields.reason && <ErrorAlert className="mt-3" message={errorMessage(setBlocked.error)} />}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onDone} disabled={setBlocked.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant={block ? 'danger' : 'primary'} disabled={setBlocked.isPending}>
            {setBlocked.isPending && <Spinner className="size-4 text-white" />}
            {block ? 'Block' : 'Unblock'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
