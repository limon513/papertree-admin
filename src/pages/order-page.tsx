import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Banknote, MapPin, Pencil, Phone, Printer, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { useAddOrderNote, useAddPayment, useOrder, useSetCourier, useSetOrderStatus } from '@/hooks/use-orders';
import { ApiError, errorMessage } from '@/lib/api';
import { imageUrl } from '@/lib/store';
import type { Order, OrderStatus, PaymentMethod } from '@/lib/types';
import { cn, formatDateTime, formatMoney, timeAgo } from '@/lib/utils';
import { CHANNELS, ORDER_STATUS, orderNo, OrderStatusBadge, PAYMENT_METHODS, PaymentBadge } from '@/components/orders/labels';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogBody, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { AddonInput, Input, Select, Textarea } from '@/components/ui/input';
import { ErrorAlert, LoadError, Skeleton, Spinner } from '@/components/ui/misc';

export const COURIERS = ['Steadfast', 'Pathao', 'RedX', 'Paperfly', 'eCourier', 'Sundarban', 'SA Paribahan', 'Own delivery'];

const FORWARD: OrderStatus[] = ['confirmed', 'packed', 'shipped', 'delivered'];

export function OrderPage() {
  const id = Number(useParams().id);
  const order = useOrder(id);
  const [statusTo, setStatusTo] = useState<OrderStatus | null>(null);
  const [paying, setPaying] = useState(false);

  if (order.isError) return <LoadError message={errorMessage(order.error)} onRetry={() => order.refetch()} />;
  if (order.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  const o = order.data;
  const due = Math.round((o.total - o.paidAmount) * 100) / 100;
  const forward = o.nextStatuses.filter((s) => FORWARD.includes(s));
  const other = o.nextStatuses.filter((s) => !FORWARD.includes(s));

  return (
    <div className="space-y-6">
      <div>
        <Link to="/orders" className="mb-1 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800">
          <ArrowLeft className="size-4" /> Orders
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Order {orderNo(o.number)}</h1>
            <OrderStatusBadge status={o.status} />
            <PaymentBadge status={o.paymentStatus} />
            {o.type === 'wholesale' && <Badge variant="violet">Wholesale</Badge>}
          </div>
          <div className="flex flex-wrap gap-2">
            {o.canEdit && (
              <Button variant="outline" asChild>
                <Link to={`/orders/${o.id}/edit`}>
                  <Pencil /> Change
                </Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to={`/orders/${o.id}/invoice`} target="_blank">
                <Printer /> Invoice
              </Link>
            </Button>
            {other.map((s) => (
              <Button key={s} variant="outline" onClick={() => setStatusTo(s)}>
                {ORDER_STATUS[s].action}
              </Button>
            ))}
            {forward.map((s, i) => (
              <Button key={s} variant={i === 0 ? 'primary' : 'outline'} onClick={() => setStatusTo(s)}>
                {ORDER_STATUS[s].action}
              </Button>
            ))}
          </div>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          {formatDateTime(o.createdAt)} · {CHANNELS[o.channel]}
          {o.createdByName && ` · entered by ${o.createdByName}`}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <ul className="divide-y divide-zinc-100 border-t border-zinc-200">
              {o.items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="size-12 shrink-0 overflow-hidden rounded-md bg-zinc-100">
                    {i.image && <img src={imageUrl(i.image, 160)} alt="" className="size-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    {i.productId ? (
                      <Link to={`/products/${i.productId}`} className="font-medium text-zinc-900 hover:text-brand-700">
                        {i.name}
                      </Link>
                    ) : (
                      <span className="font-medium text-zinc-900">{i.name}</span>
                    )}
                    <div className="text-xs text-zinc-500">{[i.variantLabel, i.sku].filter(Boolean).join(' · ')}</div>
                  </div>
                  <div className="text-right text-sm whitespace-nowrap text-zinc-600 tabular-nums">
                    {i.quantity} × {formatMoney(i.unitPrice)}
                    {i.unitPrice < i.regularPrice && <div className="text-xs text-zinc-400 line-through">{formatMoney(i.regularPrice)}</div>}
                  </div>
                  <div className="w-24 text-right font-medium text-zinc-900 tabular-nums">{formatMoney(i.lineTotal)}</div>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t border-zinc-200 bg-zinc-50/50 px-5 py-4 text-sm">
              <Row label="Subtotal" value={formatMoney(o.subtotal)} />
              {o.discount > 0 && <Row label="Discount" value={`− ${formatMoney(o.discount)}`} />}
              <Row
                label={`Delivery${o.deliveryZoneName ? ` (${o.deliveryZoneName}${o.weightGrams ? `, ${(o.weightGrams / 1000).toFixed(2)} kg` : ''})` : ''}`}
                value={o.deliveryFee === 0 ? 'Free' : formatMoney(o.deliveryFee)}
              />
              <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-semibold text-zinc-900">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatMoney(o.total)}</dd>
              </div>
            </dl>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {o.customer ? (
                  <Link to={`/customers/${o.customer.id}`} className="block font-medium text-zinc-900 hover:text-brand-700">
                    {o.customerName}
                    {o.customer.businessName && o.customer.businessName !== o.customerName && (
                      <span className="font-normal text-zinc-500"> · {o.customer.businessName}</span>
                    )}
                  </Link>
                ) : (
                  <div className="font-medium text-zinc-900">{o.customerName}</div>
                )}
                <a href={`tel:${o.phone}`} className="flex items-center gap-1.5 text-brand-700 hover:underline">
                  <Phone className="size-3.5" /> {o.phone}
                </a>
                {o.email && <div className="text-zinc-600">{o.email}</div>}
                {o.customer && (
                  <div className="text-xs text-zinc-500">
                    {o.customer.orders} order{o.customer.orders === 1 ? '' : 's'} in total
                    {o.customer.type === 'business' && ' · business customer'}
                  </div>
                )}
                {o.customer?.isBlocked && (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-800">
                    <span className="font-medium">Blocked customer:</span> {o.customer.blockedReason}
                  </p>
                )}
                {o.customer?.termsNote && (
                  <p className="rounded-md bg-violet-50 px-3 py-2 text-violet-900">
                    <span className="font-medium">Business terms:</span> {o.customer.termsNote}
                  </p>
                )}
                <div className="flex gap-1.5 pt-1 text-zinc-700">
                  <MapPin className="mt-0.5 size-3.5 shrink-0 text-zinc-400" />
                  <span>
                    {o.address}
                    <br />
                    {o.areaName ? `${o.areaName}, ` : ''}
                    {o.districtName}
                  </span>
                </div>
                {o.customerNote && (
                  <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-900">
                    <span className="font-medium">Customer note:</span> {o.customerNote}
                  </p>
                )}
                {o.staffNote && (
                  <p className="rounded-md bg-zinc-100 px-3 py-2 text-zinc-700">
                    <span className="font-medium">Staff note:</span> {o.staffNote}
                  </p>
                )}
              </CardContent>
            </Card>
            <CourierCard order={o} />
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Payment</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setPaying(true)}>
                <Banknote /> Record payment
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <dl className="space-y-1.5">
                <Row label="Will pay by" value={PAYMENT_METHODS[o.paymentMethod]} />
                {o.advanceRequired > 0 && <Row label="Advance needed" value={formatMoney(o.advanceRequired)} />}
                <Row label="Paid" value={formatMoney(o.paidAmount)} />
                <div className={cn('flex justify-between font-semibold', due > 0 ? 'text-red-700' : 'text-zinc-900')}>
                  <dt>{due >= 0 ? 'Still to pay' : 'Paid too much'}</dt>
                  <dd className="tabular-nums">{formatMoney(Math.abs(due))}</dd>
                </div>
              </dl>
              {o.advanceRequired > 0 && o.paidAmount < o.advanceRequired && !['cancelled', 'returned'].includes(o.status) && (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-900">Wait for the advance before sending this wholesale order.</p>
              )}
              {o.payments.length > 0 && (
                <ul className="divide-y divide-zinc-100 border-t border-zinc-200 pt-1">
                  {o.payments.map((p) => (
                    <li key={p.id} className="flex justify-between gap-2 py-2">
                      <span>
                        <span className="font-medium text-zinc-800">{PAYMENT_METHODS[p.method]}</span>
                        {p.reference && <span className="text-zinc-500"> · {p.reference}</span>}
                        <span className="block text-xs text-zinc-500">
                          {formatDateTime(p.createdAt)}
                          {p.by && ` · ${p.by}`}
                          {p.note && ` · ${p.note}`}
                        </span>
                      </span>
                      <span className={cn('font-medium tabular-nums', p.amount < 0 ? 'text-red-700' : 'text-zinc-900')}>
                        {p.amount < 0 ? `− ${formatMoney(-p.amount)}` : formatMoney(p.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <HistoryCard order={o} />
        </div>
      </div>

      <Dialog open={statusTo !== null} onOpenChange={(open) => !open && setStatusTo(null)}>
        {statusTo && <StatusDialog order={o} to={statusTo} onDone={() => setStatusTo(null)} />}
      </Dialog>
      <Dialog open={paying} onOpenChange={setPaying}>
        {paying && <PaymentDialog order={o} onDone={() => setPaying(false)} />}
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-zinc-600">{label}</dt>
      <dd className="text-right text-zinc-900 tabular-nums">{value}</dd>
    </div>
  );
}

function CourierField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const known = COURIERS.includes(value);
  const [other, setOther] = useState(!known && value !== '');
  return (
    <div className="space-y-2">
      <Select
        id="courier"
        value={other ? 'other' : value}
        onChange={(e) => {
          if (e.target.value === 'other') {
            setOther(true);
            onChange('');
          } else {
            setOther(false);
            onChange(e.target.value);
          }
        }}
      >
        <option value="">Choose…</option>
        {COURIERS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
        <option value="other">Other…</option>
      </Select>
      {other && <Input aria-label="Courier name" placeholder="Courier name" value={value} onChange={(e) => onChange(e.target.value)} />}
    </div>
  );
}

function StatusDialog({ order, to, onDone }: { order: Order; to: OrderStatus; onDone: () => void }) {
  const setStatus = useSetOrderStatus(order.id);
  const due = Math.round((order.total - order.paidAmount) * 100) / 100;
  const [note, setNote] = useState('');
  const [courier, setCourier] = useState(order.courier ?? '');
  const [tracking, setTracking] = useState(order.trackingCode ?? '');
  const [collect, setCollect] = useState(order.paymentMethod === 'cod');
  const fields = setStatus.error instanceof ApiError ? setStatus.error.fields : {};

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setStatus.mutate(
      {
        status: to,
        note: note.trim() || null,
        ...(to === 'shipped' && { courier: courier.trim() || null, trackingCode: tracking.trim() || null }),
        collectDue: to === 'delivered' && collect,
      },
      {
        onSuccess: () => {
          toast.success(`Order ${orderNo(order.number)}: ${ORDER_STATUS[to].label.toLowerCase()}`);
          onDone();
        },
      },
    );
  };

  const stockBack = to === 'cancelled' || to === 'returned';
  return (
    <DialogContent title={`${ORDER_STATUS[to].action}?`} description={`Order ${orderNo(order.number)} · ${order.customerName}`} size="sm">
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <DialogBody className="space-y-4">
          {to === 'shipped' && (
            <>
              <Field label="Courier" htmlFor="courier">
                <CourierField value={courier} onChange={setCourier} />
              </Field>
              <Field label="Tracking code" htmlFor="tracking" error={fields.trackingCode}>
                <Input id="tracking" value={tracking} onChange={(e) => setTracking(e.target.value)} maxLength={100} />
              </Field>
            </>
          )}
          {to === 'delivered' && due > 0 && (
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-zinc-700">
              <Checkbox checked={collect} onCheckedChange={(v) => setCollect(v === true)} className="mt-0.5" />
              <span>
                The courier collected {formatMoney(due)} cash
                <span className="block text-xs text-zinc-500">Records the payment, so the order shows as paid.</span>
              </span>
            </label>
          )}
          {stockBack && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
              The items go back into stock.
              {order.paidAmount > 0 && ` ${formatMoney(order.paidAmount)} was paid: record the refund under Payment.`}
            </p>
          )}
          <Field label="Note" htmlFor="status-note" hint="Optional, shown in the history">
            <Textarea id="status-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
          </Field>
          {setStatus.error && <ErrorAlert message={errorMessage(setStatus.error)} />}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onDone} disabled={setStatus.isPending}>
            Back
          </Button>
          <Button type="submit" variant={stockBack ? 'danger' : 'primary'} disabled={setStatus.isPending}>
            {setStatus.isPending && <Spinner className="size-4 text-white" />}
            {ORDER_STATUS[to].action}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function PaymentDialog({ order, onDone }: { order: Order; onDone: () => void }) {
  const pay = useAddPayment(order.id);
  const due = Math.round((order.total - order.paidAmount) * 100) / 100;
  const suggested = order.advanceRequired > order.paidAmount ? order.advanceRequired - order.paidAmount : Math.max(due, 0);
  const [refund, setRefund] = useState(due <= 0 && order.paidAmount > 0);
  const [method, setMethod] = useState<PaymentMethod>(order.paymentMethod === 'cod' ? 'bkash' : order.paymentMethod);
  const [amount, setAmount] = useState(String(refund ? order.paidAmount : suggested || ''));
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const fields = pay.error instanceof ApiError ? pay.error.fields : {};

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    pay.mutate(
      { method, amount: refund ? -value : value, reference: reference.trim() || null, note: note.trim() || null },
      {
        onSuccess: () => {
          toast.success(refund ? 'Refund recorded' : 'Payment recorded');
          onDone();
        },
      },
    );
  };

  return (
    <DialogContent title={refund ? 'Record a refund' : 'Record a payment'} description={`Order ${orderNo(order.number)} · still to pay ${formatMoney(Math.max(due, 0))}`} size="sm">
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <DialogBody className="space-y-4">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 p-1 text-sm">
            {[false, true].map((r) => (
              <button
                key={String(r)}
                type="button"
                onClick={() => setRefund(r)}
                className={cn('rounded-md py-1.5 font-medium', refund === r ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500')}
              >
                {r ? 'Money paid back' : 'Money received'}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Method" htmlFor="pay-method">
              <Select id="pay-method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Amount" htmlFor="pay-amount" error={fields.amount}>
              <AddonInput id="pay-amount" prefix="৳" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} invalid={!!fields.amount} autoFocus />
            </Field>
          </div>
          <Field label="Transaction id or reference" htmlFor="pay-ref" hint="e.g. the bKash TrxID">
            <Input id="pay-ref" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={100} />
          </Field>
          <Field label="Note" htmlFor="pay-note">
            <Input id="pay-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          </Field>
          {pay.error && !fields.amount && <ErrorAlert message={errorMessage(pay.error)} />}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onDone} disabled={pay.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pay.isPending}>
            {pay.isPending && <Spinner className="size-4 text-white" />}
            {refund ? 'Record refund' : 'Record payment'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function CourierCard({ order }: { order: Order }) {
  const save = useSetCourier(order.id);
  const [editing, setEditing] = useState(false);
  const [courier, setCourier] = useState(order.courier ?? '');
  const [tracking, setTracking] = useState(order.trackingCode ?? '');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Truck className="size-5 text-zinc-400" /> Delivery
        </CardTitle>
        {!editing && (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            {order.courier ? 'Change' : 'Add courier'}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {editing ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(
                { courier: courier.trim() || null, trackingCode: tracking.trim() || null },
                {
                  onSuccess: () => {
                    toast.success('Courier saved');
                    setEditing(false);
                  },
                  onError: (err) => toast.error(errorMessage(err)),
                },
              );
            }}
          >
            <CourierField value={courier} onChange={setCourier} />
            <Input aria-label="Tracking code" placeholder="Tracking code" value={tracking} onChange={(e) => setTracking(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={save.isPending}>
                Save
              </Button>
            </div>
          </form>
        ) : order.courier ? (
          <>
            <div className="font-medium text-zinc-900">{order.courier}</div>
            {order.trackingCode && <div className="text-zinc-600">Tracking: {order.trackingCode}</div>}
          </>
        ) : (
          <p className="text-zinc-500">No courier yet. It is asked for when you mark the order shipped.</p>
        )}
        <dl className="space-y-1 border-t border-zinc-100 pt-2 text-xs text-zinc-500">
          {order.confirmedAt && <div>Confirmed {formatDateTime(order.confirmedAt)}</div>}
          {order.shippedAt && <div>Shipped {formatDateTime(order.shippedAt)}</div>}
          {order.deliveredAt && <div>Delivered {formatDateTime(order.deliveredAt)}</div>}
          {order.cancelledAt && <div>Cancelled {formatDateTime(order.cancelledAt)}</div>}
        </dl>
      </CardContent>
    </Card>
  );
}

function HistoryCard({ order }: { order: Order }) {
  const add = useAddOrderNote(order.id);
  const [note, setNote] = useState('');

  return (
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!note.trim()) return;
            add.mutate(note.trim(), { onSuccess: () => setNote(''), onError: (err) => toast.error(errorMessage(err)) });
          }}
        >
          <Input aria-label="Add a note" placeholder="Add a note (only staff see it)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
          <Button type="submit" variant="outline" disabled={add.isPending || !note.trim()}>
            Add
          </Button>
        </form>
        <ol className="space-y-3">
          {order.events.map((e) => (
            <li key={e.id} className="relative border-l-2 border-zinc-200 pl-3">
              <p className={cn('text-sm', e.type === 'note' ? 'text-zinc-800 italic' : 'text-zinc-800')}>{e.message}</p>
              <p className="text-xs text-zinc-500" title={formatDateTime(e.createdAt)}>
                {timeAgo(e.createdAt)}
                {e.by && ` · ${e.by}`}
              </p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
