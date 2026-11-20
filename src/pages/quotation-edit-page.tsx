import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Minus, Plus, Trash2, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useCustomerLookup, useOrderPrices } from '@/hooks/use-orders';
import { useQuotation, useSaveQuotation } from '@/hooks/use-quotations';
import { ApiError, errorMessage } from '@/lib/api';
import { imageUrl } from '@/lib/store';
import type { OrderType, OrderVariant, Quotation } from '@/lib/types';
import { cn, formatMoney } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChoiceGroup } from '@/components/ui/choice';
import { Field } from '@/components/ui/field';
import { AddonInput, Input, Select, Textarea } from '@/components/ui/input';
import { ErrorAlert, LoadError, Skeleton } from '@/components/ui/misc';
import { fromVariant, listPrice, num, ProductPicker, type Line } from './order-edit-page';

type Delivery = 'order' | 'free' | 'fixed';
const DAYS = [3, 7, 14, 30, 60];

/** A quotation's lines, to start a revision: the quoted prices are kept (bulk ones worked out again). */
function fromQuotation(q: Quotation): Line[] {
  return q.items
    .filter((i) => i.variantId !== null)
    .map((i) => ({
      variantId: i.variantId!,
      name: i.name,
      variantLabel: i.variantLabel,
      sku: i.sku,
      image: i.image,
      quantity: String(i.quantity),
      price: String(i.bulkPercent ? Math.round(((i.lineTotal + i.bulkDiscount) / i.quantity) * 100) / 100 : i.unitPrice),
      customPrice: true,
      bulk: !!i.bulkPercent,
      retailPrice: null,
      wholesalePrice: null,
      weightGrams: null,
      stock: null,
      trackStock: false,
      allowBackorder: true,
    }));
}

/** New quotation (/quotations/new), or a new version of one (/quotations/12/revise). */
export function QuotationEditPage() {
  const { id } = useParams();
  const reviseId = id ? Number(id) : undefined;
  const quotation = useQuotation(reviseId ?? 0, reviseId !== undefined);
  if (reviseId !== undefined) {
    if (quotation.isError) return <LoadError message={errorMessage(quotation.error)} onRetry={() => quotation.refetch()} />;
    if (quotation.isPending) return <Skeleton className="h-[600px]" />;
    if (quotation.data.status !== 'open' && quotation.data.status !== 'expired') {
      return (
        <div className="space-y-3">
          <p className="text-zinc-700">This quotation is {quotation.data.status} and can no longer be revised.</p>
          <Button variant="outline" asChild>
            <Link to={`/quotations/${reviseId}`}>Back to the quotation</Link>
          </Button>
        </div>
      );
    }
  }
  return <QuotationForm key={reviseId ?? 'new'} from={reviseId !== undefined ? quotation.data! : null} />;
}

function QuotationForm({ from }: { from: Quotation | null }) {
  const navigate = useNavigate();
  const save = useSaveQuotation();
  const [type, setType] = useState<OrderType>(from?.type ?? 'retail');
  const [lines, setLines] = useState<Line[]>(() => (from ? fromQuotation(from) : []));
  const [who, setWho] = useState({ phone: from?.phone ?? '', name: from?.name ?? '', organisation: from?.organisation ?? '', email: from?.email ?? '', note: from?.note ?? '' });
  const [customerId, setCustomerId] = useState<number | null>(from?.customerId ?? null);
  const [validDays, setValidDays] = useState(7);
  const [delivery, setDelivery] = useState<Delivery>(from ? (from.deliveryFee === null ? 'order' : from.deliveryFee === 0 ? 'free' : 'fixed') : 'order');
  const [deliveryAmount, setDeliveryAmount] = useState(from?.deliveryFee ? String(from.deliveryFee) : '');
  const [terms, setTerms] = useState(from?.terms ?? '');

  // A known phone fills in the name, email and business; it also links the quotation to that customer.
  const lookup = useCustomerLookup(from ? '' : who.phone);
  const filledFrom = useRef<string | null>(null);
  useEffect(() => {
    const found = lookup.data;
    if (!found) return;
    if (!found.customer) return setCustomerId(null);
    setCustomerId(found.customer.id);
    if (filledFrom.current === found.customer.phone) return;
    filledFrom.current = found.customer.phone;
    setWho((w) => ({ ...w, name: w.name || found.customer!.name, email: w.email || found.customer!.email || '', organisation: w.organisation || found.customer!.businessName || '' }));
    if (found.customer.wholesale) changeType('wholesale');
  }, [lookup.data]);

  const changeType = (next: OrderType) => {
    setType(next);
    setLines((ls) => ls.map((l) => (l.customPrice ? l : { ...l, price: String(listPrice(l, next) ?? l.price) })));
  };
  const items = lines.map((l) => ({
    variantId: l.variantId,
    quantity: num(l.quantity),
    ...(l.customPrice || l.retailPrice === null ? { unitPrice: num(l.price) } : {}),
    bulk: l.bulk,
  }));
  const priceable = items.filter((i) => Number.isInteger(i.quantity) && i.quantity > 0 && (i.unitPrice === undefined || (Number.isFinite(i.unitPrice) && i.unitPrice >= 0)));
  const prices = useOrderPrices({ type, items: priceable });
  const fresh = prices.data && !prices.isPlaceholderData && prices.data.lines.length === priceable.length ? prices.data : null;
  const priceOf = (variantId: number) => fresh?.lines.find((l) => l.variantId === variantId);
  const subtotal = fresh?.subtotal ?? lines.reduce((s, l) => s + (num(l.price) || 0) * (num(l.quantity) || 0), 0);
  const deliveryFee = delivery === 'order' ? null : delivery === 'free' ? 0 : num(deliveryAmount);

  const fields = save.error instanceof ApiError ? save.error.fields : {};
  const general = save.error && !(save.error instanceof ApiError && Object.keys(fields).length) ? errorMessage(save.error) : null;
  const addVariant = (v: OrderVariant) => {
    const at = lines.findIndex((l) => l.variantId === v.variantId);
    if (at >= 0) setLines(lines.map((l, i) => (i === at ? { ...l, quantity: String((num(l.quantity) || 0) + 1) } : l)));
    else setLines([...lines, fromVariant(v, type)]);
  };
  const updateLine = (index: number, patch: Partial<Line>) => setLines(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (delivery === 'fixed' && !(Number.isFinite(deliveryFee) && (deliveryFee as number) >= 0)) {
      toast.error('Enter the delivery charge, or choose another delivery option');
      return;
    }
    save.mutate(
      {
        revise: from?.id,
        input: {
          type,
          customerId,
          name: who.name,
          organisation: who.organisation.trim() || null,
          phone: who.phone,
          email: who.email.trim() || null,
          note: who.note.trim() || null,
          terms: terms.trim() || null,
          validDays,
          deliveryFee,
          items,
        },
      },
      {
        onSuccess: (q) => {
          toast.success(from ? `${q.number} made: it replaces ${from.number}` : `Quotation ${q.number} made`);
          navigate(`/quotations/${q.id}`);
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <div>
        <Link to={from ? `/quotations/${from.id}` : '/quotations'} className="mb-1 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800">
          <ArrowLeft className="size-4" /> {from ? `Quotation ${from.number}` : 'Quotations'}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{from ? `Revise ${from.number}` : 'New quotation'}</h1>
        {from && <p className="mt-1 text-sm text-zinc-500">Saving makes a new quotation with a new number. {from.number} is then replaced: its page points to the new one and it can no longer be ordered.</p>}
      </div>
      {general && <ErrorAlert message={general} />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Products and prices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ProductPicker onPick={addVariant} type={type} />
              {fields.items && <p className="text-sm text-red-600">{fields.items}</p>}
              {lines.length > 0 && (
                <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
                  {lines.map((l, i) => {
                    const qty = num(l.quantity) || 0;
                    const list = listPrice(l, type);
                    const p = priceOf(l.variantId);
                    const err = fields[`items.${i}.quantity`] ?? fields[`items.${i}.unitPrice`] ?? fields[`items.${i}.variantId`];
                    return (
                      <div key={l.variantId} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
                        <div className="size-12 shrink-0 overflow-hidden rounded-md bg-zinc-100">{l.image && <img src={imageUrl(l.image, 160)} alt="" className="size-full object-cover" />}</div>
                        <div className="min-w-0 flex-1 basis-48">
                          <div className="truncate font-medium text-zinc-900">{l.name}</div>
                          <div className="text-xs text-zinc-500">{[l.variantLabel, l.sku].filter(Boolean).join(' · ')}</div>
                          {err && <div className="text-xs font-medium text-red-600">{err}</div>}
                        </div>
                        <div className="flex items-center">
                          <Button type="button" variant="outline" size="icon" className="size-8 rounded-r-none" onClick={() => updateLine(i, { quantity: String(Math.max(1, qty - 1)) })} aria-label={`One less ${l.name}`}>
                            <Minus />
                          </Button>
                          <Input
                            aria-label={`Quantity of ${l.name}`}
                            inputMode="numeric"
                            value={l.quantity}
                            onChange={(e) => updateLine(i, { quantity: e.target.value.replace(/\D/g, '') })}
                            className="h-8 w-16 rounded-none border-x-0 text-center"
                          />
                          <Button type="button" variant="outline" size="icon" className="size-8 rounded-l-none" onClick={() => updateLine(i, { quantity: String(qty + 1) })} aria-label={`One more ${l.name}`}>
                            <Plus />
                          </Button>
                        </div>
                        <div className="w-28">
                          <AddonInput
                            prefix="৳"
                            aria-label={`Price of ${l.name}`}
                            inputMode="decimal"
                            value={l.price}
                            onChange={(e) => updateLine(i, { price: e.target.value, customPrice: true, bulk: false })}
                            className="h-8"
                          />
                          {l.customPrice && list !== null && num(l.price) !== list && (
                            <button type="button" className="mt-0.5 text-xs text-brand-700 hover:underline" onClick={() => updateLine(i, { price: String(list), customPrice: false, bulk: true })}>
                              Use {formatMoney(list)}
                            </button>
                          )}
                        </div>
                        <div className="w-28 text-right tabular-nums">
                          <div className="font-medium text-zinc-900">{formatMoney(p?.lineTotal ?? (num(l.price) || 0) * qty)}</div>
                          {p?.bulkPercent ? <div className="text-xs text-brand-700">Bulk {p.bulkPercent}%</div> : l.customPrice ? <div className="text-xs text-zinc-500">Special price</div> : null}
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => setLines(lines.filter((_, n) => n !== i))} aria-label={`Remove ${l.name}`}>
                          <Trash2 />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
              {!lines.length && <p className="text-sm text-zinc-500">Search above and add products. Type a price to give a special price for this quotation.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Who it is for</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Phone"
                  htmlFor="q-phone"
                  required
                  error={fields.phone}
                  hint={
                    lookup.data?.customer ? (
                      <span className="inline-flex items-center gap-1 text-brand-700">
                        <UserCheck className="size-3.5" /> {lookup.data.customer.name}
                        {lookup.data.customer.wholesale && ' · business'}
                      </span>
                    ) : (
                      'A known number fills in the rest'
                    )
                  }
                >
                  <Input id="q-phone" type="tel" value={who.phone} onChange={(e) => setWho({ ...who, phone: e.target.value })} invalid={!!fields.phone} placeholder="01712345678" autoFocus={!from} />
                </Field>
                <Field label="Name" htmlFor="q-name" required error={fields.name}>
                  <Input id="q-name" value={who.name} onChange={(e) => setWho({ ...who, name: e.target.value })} invalid={!!fields.name} maxLength={100} />
                </Field>
                <Field label="School, office or shop" htmlFor="q-org" error={fields.organisation}>
                  <Input id="q-org" value={who.organisation} onChange={(e) => setWho({ ...who, organisation: e.target.value })} maxLength={150} />
                </Field>
                <Field label="Email" htmlFor="q-email" error={fields.email} hint="To send it by email.">
                  <Input id="q-email" type="email" value={who.email} onChange={(e) => setWho({ ...who, email: e.target.value })} invalid={!!fields.email} />
                </Field>
              </div>
              <Field label="Their reference" htmlFor="q-note" error={fields.note}>
                <Input id="q-note" value={who.note} onChange={(e) => setWho({ ...who, note: e.target.value })} maxLength={500} placeholder="e.g. Exam stationery, December" />
              </Field>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Prices" htmlFor="q-type" error={fields.type}>
                <Select id="q-type" value={type} onChange={(e) => changeType(e.target.value as OrderType)} invalid={!!fields.type}>
                  <option value="retail">Retail prices</option>
                  <option value="wholesale">Wholesale prices (approved business)</option>
                </Select>
              </Field>
              <Field label="Valid for" htmlFor="q-days" error={fields.validDays}>
                <Select id="q-days" value={String(validDays)} onChange={(e) => setValidDays(Number(e.target.value))}>
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d} days
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-zinc-800">Delivery</p>
                <ChoiceGroup
                  name="q-delivery"
                  label="Delivery"
                  value={delivery}
                  onChange={setDelivery}
                  className="sm:grid-cols-1"
                  choices={[
                    { value: 'order', label: 'Worked out when they order', description: 'The usual charge for their area' },
                    { value: 'free', label: 'Free delivery' },
                    { value: 'fixed', label: 'A fixed charge' },
                  ]}
                />
                {delivery === 'fixed' && (
                  <AddonInput prefix="৳" aria-label="Delivery charge" inputMode="decimal" value={deliveryAmount} onChange={(e) => setDeliveryAmount(e.target.value)} className="mt-2" />
                )}
                {fields.deliveryFee && <p className="text-sm text-red-600">{fields.deliveryFee}</p>}
              </div>
              <Field label="Terms on the quotation" htmlFor="q-terms" error={fields.terms} hint="Optional. Shown on the quotation and in the email.">
                <Textarea id="q-terms" rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} maxLength={2000} placeholder="e.g. 50% advance, the rest on delivery. Delivery within 3 days." />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-1.5 pt-5 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-600">Items</span>
                <span className="tabular-nums">{formatMoney(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">Delivery</span>
                <span className="tabular-nums">{deliveryFee === null ? 'When ordering' : deliveryFee === 0 ? 'Free' : Number.isFinite(deliveryFee) ? formatMoney(deliveryFee) : '—'}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-semibold">
                <span>Total</span>
                <span className={cn('tabular-nums', prices.isFetching && 'opacity-60')}>{formatMoney(subtotal + (deliveryFee && Number.isFinite(deliveryFee) ? deliveryFee : 0))}</span>
              </div>
              <Button type="submit" className="mt-3 w-full" loading={save.isPending} disabled={!lines.length}>
                {from ? 'Save as a new version' : 'Make the quotation'}
              </Button>
              <p className="text-xs text-zinc-500">Then send it to the customer by SMS or email from its page.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
