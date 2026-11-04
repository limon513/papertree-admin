import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, Minus, PackageSearch, Plus, Search, Trash2, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useCustomerLookup, useOrder, useOrderDeliveryQuote, useSaveOrder, useVariantSearch } from '@/hooks/use-orders';
import { useBdLocations } from '@/hooks/use-settings';
import { ApiError, errorMessage } from '@/lib/api';
import { imageUrl } from '@/lib/store';
import type { Order, OrderChannel, OrderType, OrderVariant, PaymentMethod } from '@/lib/types';
import { cn, formatMoney } from '@/lib/utils';
import { CHANNELS, orderNo, PAYMENT_METHODS } from '@/components/orders/labels';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { AddonInput, Input, Select, Textarea } from '@/components/ui/input';
import { ErrorAlert, LoadError, Skeleton, Spinner } from '@/components/ui/misc';

interface Line {
  variantId: number;
  name: string;
  variantLabel: string | null;
  sku: string | null;
  image: OrderVariant['image'];
  quantity: string;
  /** What the line costs now. */
  price: string;
  /** Typed by staff (or kept from the saved order): not replaced when the order type changes. */
  customPrice: boolean;
  retailPrice: number | null;
  wholesalePrice: number | null;
  weightGrams: number | null;
  /** null when unknown (saved lines whose product is gone). */
  stock: number | null;
  trackStock: boolean;
  allowBackorder: boolean;
}

const listPrice = (line: Pick<Line, 'retailPrice' | 'wholesalePrice'>, type: OrderType) =>
  type === 'wholesale' ? (line.wholesalePrice ?? line.retailPrice) : line.retailPrice;

const num = (text: string) => (text.trim() === '' ? Number.NaN : Number(text));

function fromVariant(v: OrderVariant, type: OrderType): Line {
  const line = {
    variantId: v.variantId,
    name: v.name,
    variantLabel: v.variantLabel,
    sku: v.sku,
    image: v.image,
    quantity: '1',
    price: '',
    customPrice: false,
    retailPrice: v.price,
    wholesalePrice: v.wholesalePrice,
    weightGrams: v.weightGrams,
    stock: v.stock,
    trackStock: v.trackStock,
    allowBackorder: v.allowBackorder,
  };
  return { ...line, price: String(listPrice(line, type) ?? '') };
}

function fromOrder(order: Order): Line[] {
  return order.items
    .filter((i) => i.variantId !== null)
    .map((i) => ({
      variantId: i.variantId!,
      name: i.name,
      variantLabel: i.variantLabel,
      sku: i.sku,
      image: i.image,
      quantity: String(i.quantity),
      // Keep the price the customer agreed to.
      price: String(i.unitPrice),
      customPrice: true,
      retailPrice: null,
      wholesalePrice: null,
      weightGrams: i.weightGrams,
      stock: null,
      trackStock: false,
      allowBackorder: true,
    }));
}

export function OrderEditPage() {
  const { id } = useParams();
  const orderId = id && id !== 'new' ? Number(id) : undefined;
  const order = useOrder(orderId);

  if (orderId !== undefined) {
    if (order.isError) return <LoadError message={errorMessage(order.error)} onRetry={() => order.refetch()} />;
    if (order.isPending) return <Skeleton className="h-[600px]" />;
    if (!order.data.canEdit) {
      return (
        <div className="space-y-3">
          <p className="text-zinc-700">This order is {order.data.status} and can no longer be changed.</p>
          <Button variant="outline" asChild>
            <Link to={`/orders/${orderId}`}>Back to the order</Link>
          </Button>
        </div>
      );
    }
  }
  return <OrderForm key={orderId ?? 'new'} order={order.data ?? null} />;
}

function OrderForm({ order }: { order: Order | null }) {
  const navigate = useNavigate();
  const save = useSaveOrder();
  const places = useBdLocations();

  const [type, setType] = useState<OrderType>(order?.type ?? 'retail');
  const [channel, setChannel] = useState<OrderChannel>(order?.channel ?? 'phone');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(order?.paymentMethod ?? 'cod');
  const [lines, setLines] = useState<Line[]>(() => (order ? fromOrder(order) : []));
  // From a customer page: /orders/new?phone=01712345678
  const [params] = useSearchParams();
  const [customer, setCustomer] = useState({ name: order?.customerName ?? '', phone: order?.phone ?? params.get('phone') ?? '', email: order?.email ?? '' });
  const [place, setPlace] = useState({ districtId: order?.districtId ?? '', areaId: order?.areaId ?? '', address: order?.address ?? '' });
  const [discount, setDiscount] = useState(order ? String(order.discount || '') : '');
  // A saved order keeps its delivery charge until staff choose the zone charge again.
  const [deliveryOverride, setDeliveryOverride] = useState<string | null>(order ? String(order.deliveryFee) : null);
  const [customerNote, setCustomerNote] = useState(order?.customerNote ?? '');
  const [staffNote, setStaffNote] = useState(order?.staffNote ?? '');

  // A known phone number fills in the customer and their last address.
  const lookup = useCustomerLookup(order ? '' : customer.phone);
  const filledFrom = useRef<string | null>(null);
  useEffect(() => {
    const found = lookup.data;
    if (!found?.customer || filledFrom.current === found.customer.phone) return;
    filledFrom.current = found.customer.phone;
    setCustomer((c) => ({ ...c, name: c.name || found.customer!.name, email: c.email || found.customer!.email || '' }));
    if (found.lastAddress && !place.districtId && !place.address) {
      setPlace({ districtId: found.lastAddress.districtId, areaId: found.lastAddress.areaId ?? '', address: found.lastAddress.address });
    }
    if (found.customer.wholesale) setType('wholesale');
  }, [lookup.data]);

  // Retail and wholesale have different prices.
  const changeType = (next: OrderType) => {
    setType(next);
    setLines((ls) => ls.map((l) => (l.customPrice ? l : { ...l, price: String(listPrice(l, next) ?? l.price) })));
  };

  const subtotal = lines.reduce((sum, l) => sum + (num(l.price) || 0) * (num(l.quantity) || 0), 0);
  const weightKg = lines.reduce((sum, l) => sum + (l.weightGrams ?? 0) * (num(l.quantity) || 0), 0) / 1000;
  const quote = useOrderDeliveryQuote({
    districtId: place.districtId,
    areaId: place.areaId || null,
    subtotal: Math.round(subtotal * 100) / 100,
    weightKg,
    wholesale: type === 'wholesale',
  });
  const deliveryFee = deliveryOverride !== null ? num(deliveryOverride) || 0 : (quote.data?.fee ?? 0);
  const discountValue = num(discount) || 0;
  const total = Math.max(0, subtotal - discountValue) + deliveryFee;

  const areas = useMemo(
    () =>
      (places.data?.areas ?? [])
        .filter((a) => a.districtId === place.districtId)
        .sort((x, y) => Number(y.city) - Number(x.city) || x.name.localeCompare(y.name)),
    [places.data, place.districtId],
  );

  const fields = save.error instanceof ApiError ? save.error.fields : {};
  const general = save.error && !(save.error instanceof ApiError && Object.keys(fields).length) ? errorMessage(save.error) : null;
  const firstFieldError = Object.values(fields)[0];

  const addVariant = (v: OrderVariant) => {
    const existing = lines.findIndex((l) => l.variantId === v.variantId);
    if (existing >= 0) {
      setLines(lines.map((l, i) => (i === existing ? { ...l, quantity: String((num(l.quantity) || 0) + 1) } : l)));
    } else {
      setLines([...lines, fromVariant(v, type)]);
    }
  };
  const updateLine = (index: number, patch: Partial<Line>) => setLines(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(
      {
        id: order?.id,
        input: {
          type,
          channel,
          paymentMethod,
          customer: { name: customer.name, phone: customer.phone, email: customer.email.trim() || null },
          districtId: place.districtId,
          areaId: place.areaId || null,
          address: place.address,
          items: lines.map((l) => ({
            variantId: l.variantId,
            quantity: num(l.quantity),
            ...(l.customPrice || l.retailPrice === null ? { unitPrice: num(l.price) } : {}),
          })),
          discount: discountValue,
          deliveryFee: deliveryOverride !== null ? num(deliveryOverride) : null,
          customerNote: customerNote.trim() || null,
          staffNote: staffNote.trim() || null,
        },
      },
      {
        onSuccess: (saved) => {
          toast.success(order ? 'Order saved' : `Order ${orderNo(saved.number)} placed`);
          navigate(`/orders/${saved.id}`);
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <Link
          to={order ? `/orders/${order.id}` : '/orders'}
          className="mb-1 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800"
        >
          <ArrowLeft className="size-4" /> {order ? `Order ${orderNo(order.number)}` : 'Orders'}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{order ? `Change order ${orderNo(order.number)}` : 'New order'}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Products</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ProductPicker onPick={addVariant} type={type} />
              {fields.items && <p className="text-sm text-red-600">{fields.items}</p>}
              {lines.length > 0 && (
                <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
                  {lines.map((l, i) => {
                    const qty = num(l.quantity) || 0;
                    const short = l.trackStock && !l.allowBackorder && l.stock !== null && qty > l.stock;
                    const qtyError = fields[`items.${i}.quantity`];
                    const list = listPrice(l, type);
                    return (
                      <div key={l.variantId} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
                        <div className="size-12 shrink-0 overflow-hidden rounded-md bg-zinc-100">
                          {l.image && <img src={imageUrl(l.image, 160)} alt="" className="size-full object-cover" />}
                        </div>
                        <div className="min-w-0 flex-1 basis-48">
                          <div className="truncate font-medium text-zinc-900">{l.name}</div>
                          <div className="text-xs text-zinc-500">
                            {[l.variantLabel, l.sku].filter(Boolean).join(' · ')}
                            {l.stock !== null && l.trackStock && (
                              <span className={cn(short && 'font-medium text-red-600')}>
                                {(l.variantLabel || l.sku) && ' · '}
                                {l.stock} in stock
                              </span>
                            )}
                          </div>
                          {qtyError && <div className="text-xs font-medium text-red-600">{qtyError}</div>}
                        </div>
                        <div className="flex items-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-8 rounded-r-none"
                            onClick={() => updateLine(i, { quantity: String(Math.max(1, qty - 1)) })}
                            aria-label={`One less ${l.name}`}
                          >
                            <Minus />
                          </Button>
                          <Input
                            aria-label={`Quantity of ${l.name}`}
                            inputMode="numeric"
                            value={l.quantity}
                            onChange={(e) => updateLine(i, { quantity: e.target.value.replace(/\D/g, '') })}
                            className="h-8 w-14 rounded-none border-x-0 text-center"
                            invalid={short || !!qtyError}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-8 rounded-l-none"
                            onClick={() => updateLine(i, { quantity: String(qty + 1) })}
                            aria-label={`One more ${l.name}`}
                          >
                            <Plus />
                          </Button>
                        </div>
                        <div className="w-28">
                          <AddonInput
                            prefix="৳"
                            aria-label={`Price of ${l.name}`}
                            inputMode="decimal"
                            value={l.price}
                            onChange={(e) => updateLine(i, { price: e.target.value, customPrice: true })}
                            className="h-8"
                          />
                          {l.customPrice && list !== null && num(l.price) !== list && (
                            <button
                              type="button"
                              className="mt-0.5 text-xs text-brand-700 hover:underline"
                              onClick={() => updateLine(i, { price: String(list), customPrice: false })}
                            >
                              Use {formatMoney(list)}
                            </button>
                          )}
                        </div>
                        <div className="w-24 text-right font-medium text-zinc-900 tabular-nums">{formatMoney((num(l.price) || 0) * qty)}</div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setLines(lines.filter((_, n) => n !== i))}
                          aria-label={`Remove ${l.name}`}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer and delivery</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Phone"
                  htmlFor="order-phone"
                  required
                  error={fields['customer.phone']}
                  hint={
                    lookup.data?.customer ? (
                      <span className="inline-flex items-center gap-1 text-brand-700">
                        <UserCheck className="size-3.5" /> {lookup.data.customer.name} · {lookup.data.orders} earlier order
                        {lookup.data.orders === 1 ? '' : 's'}
                        {lookup.data.customer.wholesale && ' · business'}
                      </span>
                    ) : lookup.data ? (
                      'New customer'
                    ) : (
                      'A known number fills in the rest'
                    )
                  }
                >
                  <Input
                    id="order-phone"
                    type="tel"
                    value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                    invalid={!!fields['customer.phone']}
                    placeholder="01712345678"
                    autoFocus={!order}
                  />
                </Field>
                <Field label="Name" htmlFor="order-name" required error={fields['customer.name']}>
                  <Input
                    id="order-name"
                    value={customer.name}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    invalid={!!fields['customer.name']}
                    maxLength={100}
                  />
                </Field>
              </div>
              {lookup.data?.customer?.isBlocked && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  <span className="font-medium">Blocked customer:</span> {lookup.data.customer.blockedReason}. Check before taking this order.
                </p>
              )}
              {lookup.data?.customer?.termsNote && (
                <p className="rounded-md bg-violet-50 px-3 py-2 text-sm text-violet-900">
                  <span className="font-medium">Business terms:</span> {lookup.data.customer.termsNote}
                </p>
              )}
              <Field label="Email" htmlFor="order-email" error={fields['customer.email']} hint="Optional">
                <Input id="order-email" type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
              </Field>
              {(lookup.data?.addresses.length ?? 0) > 1 && (
                <Field label="Saved address" htmlFor="order-saved-address" hint="Fills in the address below">
                  <Select
                    id="order-saved-address"
                    value={String(
                      lookup.data!.addresses.find(
                        (a) => a.districtId === place.districtId && (a.areaId ?? '') === place.areaId && a.address === place.address,
                      )?.id ?? '',
                    )}
                    onChange={(e) => {
                      const a = lookup.data!.addresses.find((x) => String(x.id) === e.target.value);
                      if (a) setPlace({ districtId: a.districtId, areaId: a.areaId ?? '', address: a.address });
                    }}
                  >
                    <option value="">A different address</option>
                    {lookup.data!.addresses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label ? `${a.label}: ` : ''}
                        {a.address}, {[a.areaName, a.districtName].filter(Boolean).join(', ')}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="District" htmlFor="order-district" required error={fields.districtId}>
                  <Select
                    id="order-district"
                    value={place.districtId}
                    onChange={(e) => setPlace({ ...place, districtId: e.target.value, areaId: '' })}
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
                <Field label="Area" htmlFor="order-area" error={fields.areaId}>
                  <Select
                    id="order-area"
                    value={place.areaId}
                    onChange={(e) => setPlace({ ...place, areaId: e.target.value })}
                    disabled={!place.districtId}
                  >
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
              <Field label="Address" htmlFor="order-address" required error={fields.address} hint="House, road, area, landmark">
                <Textarea
                  id="order-address"
                  rows={2}
                  value={place.address}
                  onChange={(e) => setPlace({ ...place, address: e.target.value })}
                  invalid={!!fields.address}
                  maxLength={500}
                />
              </Field>
              <Field label="Note from the customer" htmlFor="order-customer-note" hint="Printed on the invoice">
                <Textarea id="order-customer-note" rows={2} value={customerNote} onChange={(e) => setCustomerNote(e.target.value)} maxLength={1000} />
              </Field>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardContent className="space-y-4 pt-5">
              <Field label="Order type" htmlFor="order-type">
                <Select id="order-type" value={type} onChange={(e) => changeType(e.target.value as OrderType)}>
                  <option value="retail">Retail</option>
                  <option value="wholesale">Wholesale (business prices and terms)</option>
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Came from" htmlFor="order-channel">
                  <Select id="order-channel" value={channel} onChange={(e) => setChannel(e.target.value as OrderChannel)}>
                    {Object.entries(CHANNELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Will pay by" htmlFor="order-payment">
                  <Select id="order-payment" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                    {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <dl className="space-y-2 border-t border-zinc-200 pt-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-zinc-600">Subtotal</dt>
                  <dd className="tabular-nums">{formatMoney(subtotal)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-zinc-600">Discount</dt>
                  <dd className="w-28">
                    <AddonInput
                      prefix="৳"
                      aria-label="Discount"
                      inputMode="decimal"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="h-8 text-right"
                      invalid={!!fields.discount}
                    />
                  </dd>
                </div>
                {fields.discount && <p className="text-right text-xs text-red-600">{fields.discount}</p>}
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-zinc-600">
                    Delivery
                    <span className="block text-xs text-zinc-400">
                      {deliveryOverride !== null
                        ? order && deliveryOverride === String(order.deliveryFee)
                          ? 'As on the order'
                          : 'Typed by you'
                        : quote.data?.zone
                          ? `${quote.data.zone.name}${quote.data.free ? ' · free' : ''}${weightKg ? ` · ${weightKg.toFixed(2)} kg` : ''}`
                          : place.districtId
                            ? 'No zone covers this place'
                            : 'Choose the district'}
                    </span>
                  </dt>
                  <dd className="w-28 text-right">
                    {deliveryOverride !== null ? (
                      <>
                        <AddonInput
                          prefix="৳"
                          aria-label="Delivery charge"
                          inputMode="decimal"
                          value={deliveryOverride}
                          onChange={(e) => setDeliveryOverride(e.target.value)}
                          className="h-8 text-right"
                          invalid={!!fields.deliveryFee}
                        />
                        <button type="button" className="mt-0.5 text-xs text-brand-700 hover:underline" onClick={() => setDeliveryOverride(null)}>
                          Use the zone charge
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="tabular-nums">{quote.isFetching && !quote.data ? '…' : formatMoney(deliveryFee)}</span>
                        <button
                          type="button"
                          className="block w-full text-right text-xs text-brand-700 hover:underline"
                          onClick={() => setDeliveryOverride(String(deliveryFee))}
                        >
                          Change
                        </button>
                      </>
                    )}
                  </dd>
                </div>
                {fields.deliveryFee && <p className="text-right text-xs text-red-600">{fields.deliveryFee}</p>}
                <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-semibold text-zinc-900">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{formatMoney(total)}</dd>
                </div>
                {type === 'wholesale' && (
                  <p className="text-xs text-zinc-500">The wholesale advance is worked out from Settings when the order is saved.</p>
                )}
              </dl>

              <Field label="Staff note" htmlFor="order-staff-note" hint="Only staff see this">
                <Textarea id="order-staff-note" rows={2} value={staffNote} onChange={(e) => setStaffNote(e.target.value)} maxLength={2000} />
              </Field>

              {(general || firstFieldError) && <ErrorAlert message={general ?? `Please check: ${firstFieldError}`} />}
              <Button type="submit" className="w-full" disabled={save.isPending || lines.length === 0}>
                {save.isPending && <Spinner className="size-4 text-white" />}
                {order ? 'Save changes' : 'Place order'}
              </Button>
              {!order && <p className="text-center text-xs text-zinc-500">Stock is taken as soon as the order is placed.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}

/** Search box with results; Enter or click adds the product. */
function ProductPicker({ onPick, type }: { onPick: (v: OrderVariant) => void; type: OrderType }) {
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), 250);
    return () => clearTimeout(timer);
  }, [text]);
  const results = useVariantSearch(query);
  // Never list results of an earlier search: a quick Enter would add the wrong product.
  const searching = results.isPending || results.isPlaceholderData || text.trim() !== query;
  const items = open && query && !searching ? (results.data?.items ?? []) : [];

  const pick = (v: OrderVariant) => {
    onPick(v);
    setText('');
    setQuery('');
    setActive(0);
  };

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
      <Input
        aria-label="Find a product"
        placeholder="Find a product by name or SKU"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!items.length) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(items.length - 1, a + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            pick(items[active]!);
          }
        }}
        className="pl-9"
      />
      {open && text.trim() && (
        <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg">
          {searching ? (
            <div className="flex justify-center p-4">
              <Spinner />
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center gap-2 p-4 text-sm text-zinc-500">
              <PackageSearch className="size-4" /> No products found
            </div>
          ) : (
            items.map((v, i) => {
              const price = type === 'wholesale' ? (v.wholesalePrice ?? v.price) : v.price;
              const out = v.trackStock && !v.allowBackorder && v.stock <= 0;
              return (
                <button
                  key={v.variantId}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(v)}
                  onMouseEnter={() => setActive(i)}
                  disabled={out}
                  className={cn('flex w-full items-center gap-3 px-3 py-2 text-left', i === active && 'bg-zinc-50', out && 'opacity-50')}
                >
                  <div className="size-9 shrink-0 overflow-hidden rounded bg-zinc-100">
                    {v.image && <img src={imageUrl(v.image, 160)} alt="" className="size-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-zinc-900">
                      {v.name}
                      {v.status === 'draft' && (
                        <Badge className="ml-1.5" variant="gray">
                          Draft
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {[v.variantLabel, v.sku].filter(Boolean).join(' · ')}
                      {v.trackStock && <span className={cn(out && 'text-red-600')}>{(v.variantLabel || v.sku) && ' · '}{out ? 'Out of stock' : `${v.stock} in stock`}</span>}
                    </div>
                  </div>
                  <div className="text-right text-sm font-medium text-zinc-900 tabular-nums">
                    {formatMoney(price)}
                    {type === 'retail' && v.price < v.regularPrice && (
                      <div className="text-xs font-normal text-zinc-400 line-through">{formatMoney(v.regularPrice)}</div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
