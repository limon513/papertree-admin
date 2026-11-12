import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Copy, Pencil, Plus, Search, Shuffle, TicketPercent, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useBrands, useCategories } from '@/hooks/use-catalog';
import { useCoupon, useCoupons, useDeleteCoupon, useSaveCoupon, useSwitchCoupon, type CouponInput } from '@/hooks/use-coupons';
import { useProducts } from '@/hooks/use-products';
import { ApiError, errorMessage } from '@/lib/api';
import { STORE_URL } from '@/lib/store';
import type { Coupon, CouponState, CouponType } from '@/lib/types';
import { cn, formatDateTime, formatMoney } from '@/lib/utils';
import { orderNo } from '@/components/orders/labels';
import { PageHeader } from '@/components/layout/page-header';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogBody, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { AddonInput, Input } from '@/components/ui/input';
import { EmptyState, ErrorAlert, LoadError, Skeleton } from '@/components/ui/misc';
import { SwitchField } from '@/components/ui/switch';

const STATES: Record<CouponState, { label: string; badge: BadgeProps['variant'] }> = {
  live: { label: 'Live', badge: 'green' },
  scheduled: { label: 'Starts later', badge: 'blue' },
  ended: { label: 'Ended', badge: 'gray' },
  off: { label: 'Switched off', badge: 'amber' },
};
const VIEWS: (CouponState | 'all')[] = ['all', 'live', 'scheduled', 'ended', 'off'];
const TYPES: { value: CouponType; label: string; hint: string }[] = [
  { value: 'percent', label: 'Percent off', hint: 'e.g. 10% off the items, with an optional cap.' },
  { value: 'fixed', label: 'Taka off', hint: 'e.g. ৳100 off the items.' },
  { value: 'free_delivery', label: 'Free delivery', hint: 'Takes off the delivery charge only.' },
];

const linkFor = (code: string) => `${STORE_URL.replace(/\/$/, '')}/?coupon=${encodeURIComponent(code)}`;

/** "Min ৳500 · 1 per customer · first orders · ends 30 Nov". */
function conditions(c: Coupon) {
  return [
    c.minOrder ? `min ${formatMoney(c.minOrder)}` : null,
    c.perCustomerLimit ? `${c.perCustomerLimit} per customer` : null,
    c.newCustomersOnly ? 'first orders' : null,
    c.phone ? `only ${c.phone}` : null,
    c.items.productIds.length + c.items.categoryIds.length + c.items.brandIds.length ? 'some items' : null,
    !c.onSaleItems ? 'not on sale items' : null,
    !c.withBulk ? 'not with bulk discounts' : null,
    c.startsAt && new Date(c.startsAt) > new Date() ? `starts ${formatDateTime(c.startsAt)}` : null,
    c.endsAt ? `ends ${formatDateTime(c.endsAt)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Marketing: coupon codes (automatic offers come later). */
export function MarketingPage() {
  const [view, setView] = useState<CouponState | 'all'>('all');
  const [search, setSearch] = useState('');
  const coupons = useCoupons(view, search);
  const [editing, setEditing] = useState<Coupon | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<Coupon | null>(null);
  const switchIt = useSwitchCoupon();
  const remove = useDeleteCoupon();

  const copy = async (code: string) => {
    await navigator.clipboard.writeText(linkFor(code)).catch(() => null);
    toast.success('Link copied: it adds the code for the shopper');
  };

  return (
    <div>
      <PageHeader
        title="Marketing"
        description="Coupon codes. One per order, for retail orders, on the website and on orders you take."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus /> New coupon
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg bg-zinc-200/60 p-0.5" role="group" aria-label="Show">
          {VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 aria-pressed:bg-white aria-pressed:text-zinc-900 aria-pressed:shadow-sm"
            >
              {v === 'all' ? 'All' : STATES[v].label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a code or note" aria-label="Find a coupon" className="pl-9" />
        </div>
      </div>

      {coupons.isError ? (
        <LoadError message={errorMessage(coupons.error)} onRetry={() => coupons.refetch()} />
      ) : coupons.isPending ? (
        <Skeleton className="h-64" />
      ) : !coupons.data.items.length ? (
        <Card>
          <EmptyState
            icon={<TicketPercent />}
            title={view === 'all' && !search ? 'No coupons yet' : 'No coupons here'}
            description="Make a code like SCHOOL10 and share it, or share its link: the code is added for the shopper."
            action={
              <Button onClick={() => setEditing('new')}>
                <Plus /> New coupon
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className="divide-y divide-zinc-100">
          {coupons.data.items.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
              <div className="min-w-0 flex-1 basis-64">
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => setEditing(c)} className="font-mono text-base font-semibold text-zinc-900 hover:text-brand-700">
                    {c.code}
                  </button>
                  <Badge variant={STATES[c.state].badge}>{STATES[c.state].label}</Badge>
                  <span className="text-sm font-medium text-brand-700">{c.label}</span>
                </div>
                <div className="mt-0.5 text-xs text-zinc-500">{conditions(c) || 'No conditions'}</div>
                {c.note && <div className="mt-0.5 truncate text-xs text-zinc-400">{c.note}</div>}
              </div>
              <div className="w-36 text-sm tabular-nums">
                <div className="text-zinc-900">
                  {c.usedCount} use{c.usedCount === 1 ? '' : 's'}
                  {c.usageLimit ? ` of ${c.usageLimit}` : ''}
                </div>
                <div className="text-xs text-zinc-500">{formatMoney(c.stats.given)} given</div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => copy(c.code)} aria-label={`Copy the link for ${c.code}`} title="Copy the shop link with this code">
                  <Copy />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setEditing(c)} aria-label={`Edit ${c.code}`}>
                  <Pencil />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  loading={switchIt.isPending && switchIt.variables?.id === c.id}
                  onClick={() => switchIt.mutate({ id: c.id, active: !c.isActive }, { onSuccess: () => toast.success(c.isActive ? `${c.code} switched off` : `${c.code} switched on`) })}
                >
                  {c.isActive ? 'Switch off' : 'Switch on'}
                </Button>
                {c.usedCount === 0 && (
                  <Button variant="ghost" size="icon" onClick={() => setToDelete(c)} aria-label={`Delete ${c.code}`}>
                    <Trash2 />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        {editing && <CouponForm key={editing === 'new' ? 'new' : editing.id} coupon={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />}
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Delete ${toDelete?.code}?`}
        description="It was never used, so nothing is lost."
        confirmLabel="Delete"
        danger
        loading={remove.isPending}
        onConfirm={() =>
          toDelete &&
          remove.mutate(toDelete.id, {
            onSuccess: () => (toast.success('Coupon deleted'), setToDelete(null)),
            onError: (err) => (toast.error(errorMessage(err)), setToDelete(null)),
          })
        }
      />
    </div>
  );
}

// ---- The form ----

const text = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n));
const num = (s: string) => (s.trim() === '' ? null : Number(s.replace(/,/g, '')));
/** ISO -> "YYYY-MM-DDTHH:mm" in this computer's time (Bangladesh). */
function toLocal(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const fromLocal = (s: string) => (s ? new Date(s).toISOString() : null);
/** A code that is hard to guess: 8 letters and numbers (no 0/O or 1/I mix-ups). */
function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

function CouponForm({ coupon, onDone }: { coupon: Coupon | null; onDone: () => void }) {
  const save = useSaveCoupon();
  const detail = useCoupon(coupon?.id ?? null);
  const categories = useCategories();
  const brands = useBrands();
  const [productSearch, setProductSearch] = useState('');
  const found = useProducts({ search: productSearch.trim() || undefined });
  const [f, setF] = useState({
    code: coupon?.code ?? '',
    note: coupon?.note ?? '',
    type: coupon?.type ?? ('percent' as CouponType),
    value: text(coupon?.value),
    maxDiscount: text(coupon?.maxDiscount),
    minOrder: text(coupon?.minOrder),
    startsAt: toLocal(coupon?.startsAt ?? null),
    endsAt: toLocal(coupon?.endsAt ?? null),
    usageLimit: text(coupon?.usageLimit),
    perCustomerLimit: coupon ? text(coupon.perCustomerLimit) : '1',
    newCustomersOnly: coupon?.newCustomersOnly ?? false,
    phone: coupon?.phone ?? '',
    productIds: coupon?.items.productIds ?? [],
    categoryIds: coupon?.items.categoryIds ?? [],
    brandIds: coupon?.items.brandIds ?? [],
    onSaleItems: coupon?.onSaleItems ?? true,
    withBulk: coupon?.withBulk ?? true,
    isActive: coupon?.isActive ?? true,
  });
  const [someItems, setSomeItems] = useState(!!(f.productIds.length || f.categoryIds.length || f.brandIds.length));
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));
  const fields = save.error instanceof ApiError ? save.error.fields : {};
  const general = save.error && !(save.error instanceof ApiError && Object.keys(fields).length) ? errorMessage(save.error) : null;
  const used = (coupon?.usedCount ?? 0) > 0;
  const productNames = useMemo(() => new Map((found.data?.items ?? []).map((p) => [p.id, p.name])), [found.data]);
  const [knownNames, setKnownNames] = useState<Record<number, string>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const input: CouponInput = {
      code: f.code,
      note: f.note.trim() || null,
      type: f.type,
      value: f.type === 'free_delivery' ? null : num(f.value),
      maxDiscount: f.type === 'percent' ? num(f.maxDiscount) : null,
      minOrder: num(f.minOrder),
      startsAt: fromLocal(f.startsAt),
      endsAt: fromLocal(f.endsAt),
      usageLimit: num(f.usageLimit),
      perCustomerLimit: num(f.perCustomerLimit),
      newCustomersOnly: f.newCustomersOnly,
      phone: f.phone.trim() || null,
      items: someItems ? { productIds: f.productIds, categoryIds: f.categoryIds, brandIds: f.brandIds } : { productIds: [], categoryIds: [], brandIds: [] },
      onSaleItems: f.onSaleItems,
      withBulk: f.withBulk,
      isActive: f.isActive,
    };
    save.mutate({ id: coupon?.id, input }, { onSuccess: (saved) => (toast.success(coupon ? `${saved.code} saved` : `${saved.code} created`), onDone()) });
  };

  const toggle = (key: 'productIds' | 'categoryIds' | 'brandIds', id: number) => set({ [key]: f[key].includes(id) ? f[key].filter((x) => x !== id) : [...f[key], id] });
  const cats = categories.data?.items ?? [];
  const depth = (id: number | null, n = 0): number => {
    const c = cats.find((x) => x.id === id);
    return c?.parentId ? depth(c.parentId, n + 1) : n;
  };

  return (
    <DialogContent size="lg" title={coupon ? `Coupon ${coupon.code}` : 'New coupon'} description="The shop works out every amount itself; shoppers only type or tap the code.">
      <form onSubmit={submit} noValidate>
        <DialogBody>
          {general && <ErrorAlert message={general} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Code" htmlFor="c-code" required error={fields.code} hint={used ? 'Used already, so it stays the same.' : '4 to 20 letters and numbers. Capitals do not matter for shoppers.'}>
              <div className="flex gap-2">
                <Input id="c-code" value={f.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} disabled={used} invalid={!!fields.code} className="font-mono uppercase" maxLength={24} />
                {!used && (
                  <Button type="button" variant="outline" size="icon" onClick={() => set({ code: randomCode() })} aria-label="Make a random code" title="Make a random code (hard to guess)">
                    <Shuffle />
                  </Button>
                )}
              </div>
            </Field>
            <Field label="Note for staff" htmlFor="c-note" error={fields.note} hint="What it is for, e.g. “Facebook post, school season”.">
              <Input id="c-note" value={f.note} onChange={(e) => set({ note: e.target.value })} maxLength={300} />
            </Field>
          </div>

          <Field label="What it gives" htmlFor="c-type" hint={TYPES.find((t) => t.value === f.type)?.hint}>
            <div id="c-type" className="flex flex-wrap rounded-lg bg-zinc-200/60 p-0.5" role="group">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  aria-pressed={f.type === t.value}
                  onClick={() => set({ type: t.value })}
                  className="flex-1 rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 aria-pressed:bg-white aria-pressed:text-zinc-900 aria-pressed:shadow-sm"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            {f.type !== 'free_delivery' && (
              <Field label={f.type === 'percent' ? 'Percent off' : 'Taka off'} htmlFor="c-value" required error={fields.value} hint={f.type === 'percent' ? '0.5 to 90' : 'Whole taka'}>
                <AddonInput id="c-value" inputMode="decimal" suffix={f.type === 'percent' ? '%' : undefined} prefix={f.type === 'fixed' ? '৳' : undefined} value={f.value} onChange={(e) => set({ value: e.target.value })} invalid={!!fields.value} />
              </Field>
            )}
            {f.type === 'percent' && (
              <Field label="At most" htmlFor="c-cap" error={fields.maxDiscount} hint="Empty: no cap">
                <AddonInput id="c-cap" inputMode="decimal" prefix="৳" value={f.maxDiscount} onChange={(e) => set({ maxDiscount: e.target.value })} invalid={!!fields.maxDiscount} />
              </Field>
            )}
            <Field label="Minimum order" htmlFor="c-min" error={fields.minOrder} hint="On the items, after bulk discounts">
              <AddonInput id="c-min" inputMode="decimal" prefix="৳" value={f.minOrder} onChange={(e) => set({ minOrder: e.target.value })} invalid={!!fields.minOrder} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Starts" htmlFor="c-start" error={fields.startsAt} hint="Empty: now">
              <Input id="c-start" type="datetime-local" value={f.startsAt} onChange={(e) => set({ startsAt: e.target.value })} invalid={!!fields.startsAt} />
            </Field>
            <Field label="Ends" htmlFor="c-end" error={fields.endsAt} hint="Empty: no end">
              <Input id="c-end" type="datetime-local" value={f.endsAt} onChange={(e) => set({ endsAt: e.target.value })} invalid={!!fields.endsAt} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Uses in total" htmlFor="c-limit" error={fields.usageLimit} hint="e.g. the first 100 orders. Empty: no limit.">
              <Input id="c-limit" inputMode="numeric" value={f.usageLimit} onChange={(e) => set({ usageLimit: e.target.value })} invalid={!!fields.usageLimit} />
            </Field>
            <Field label="Uses per customer" htmlFor="c-per" error={fields.perCustomerLimit} hint="By phone number and account. Empty: no limit.">
              <Input id="c-per" inputMode="numeric" value={f.perCustomerLimit} onChange={(e) => set({ perCustomerLimit: e.target.value })} invalid={!!fields.perCustomerLimit} />
            </Field>
            <Field label="Only for this phone" htmlFor="c-phone" error={fields.phone} hint="A private code for one customer. Empty: anyone.">
              <Input id="c-phone" type="tel" inputMode="tel" placeholder="01XXXXXXXXX" value={f.phone} onChange={(e) => set({ phone: e.target.value })} invalid={!!fields.phone} />
            </Field>
          </div>
          <p className="-mt-2 text-xs text-zinc-500">Every order placed with the code counts as a use, also if it is cancelled later.</p>

          <SwitchField id="c-new" label="First orders only" description="Only for a phone number that never ordered before." checked={f.newCustomersOnly} onCheckedChange={(v) => set({ newCustomersOnly: v })} />
          <SwitchField id="c-sale" label="Also on items already on sale" description="Off: items with a sale price get no coupon discount." checked={f.onSaleItems} onCheckedChange={(v) => set({ onSaleItems: v })} />
          <SwitchField id="c-bulk" label="Also with bulk discounts" description="It works on the price after the bulk discount. Off: lines with a bulk discount get no coupon discount." checked={f.withBulk} onCheckedChange={(v) => set({ withBulk: v })} />
          <SwitchField id="c-items" label="Only some items" description="Only these categories (with their sub-categories), brands or products. The minimum counts only them." checked={someItems} onCheckedChange={setSomeItems} />

          {someItems && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <div className="mb-1.5 text-sm font-medium text-zinc-800">Categories</div>
                <div className="max-h-48 space-y-0.5 overflow-y-auto rounded-lg border border-zinc-200 p-2">
                  {cats.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm" style={{ paddingLeft: depth(c.parentId) * 12 + (c.parentId ? 12 : 0) }}>
                      <input type="checkbox" checked={f.categoryIds.includes(c.id)} onChange={() => toggle('categoryIds', c.id)} className="accent-brand-700" />
                      {c.name}
                    </label>
                  ))}
                </div>
                {fields['items.categoryIds'] && <p className="mt-1 text-sm text-red-600">{fields['items.categoryIds']}</p>}
              </div>
              <div>
                <div className="mb-1.5 text-sm font-medium text-zinc-800">Brands</div>
                <div className="max-h-48 space-y-0.5 overflow-y-auto rounded-lg border border-zinc-200 p-2">
                  {(brands.data?.items ?? []).map((b) => (
                    <label key={b.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={f.brandIds.includes(b.id)} onChange={() => toggle('brandIds', b.id)} className="accent-brand-700" />
                      {b.name}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1.5 text-sm font-medium text-zinc-800">Products</div>
                <Input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Find a product" aria-label="Find a product for the coupon" />
                <div className="mt-1 max-h-36 space-y-0.5 overflow-y-auto rounded-lg border border-zinc-200 p-2">
                  {[...new Set([...f.productIds, ...(productSearch.trim() ? (found.data?.items ?? []).slice(0, 15).map((p) => p.id) : [])])].map((id) => (
                    <label key={id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={f.productIds.includes(id)}
                        onChange={() => {
                          const name = productNames.get(id);
                          if (name) setKnownNames((k) => ({ ...k, [id]: name }));
                          toggle('productIds', id);
                        }}
                        className="accent-brand-700"
                      />
                      <span className="truncate">{productNames.get(id) ?? knownNames[id] ?? `Product #${id}`}</span>
                    </label>
                  ))}
                  {!f.productIds.length && !productSearch.trim() && <p className="text-xs text-zinc-400">Search to add products.</p>}
                </div>
              </div>
            </div>
          )}

          <SwitchField id="c-active" label="Switched on" description="Off: the code stops working at once (orders already placed keep it)." checked={f.isActive} onCheckedChange={(v) => set({ isActive: v })} />

          {coupon && (
            <div className="rounded-lg border border-zinc-200">
              <div className="flex flex-wrap gap-x-6 gap-y-1 border-b border-zinc-100 px-3 py-2 text-sm">
                <span>
                  <strong>{coupon.usedCount}</strong> use{coupon.usedCount === 1 ? '' : 's'}
                </span>
                <span>
                  <strong>{formatMoney(coupon.stats.given)}</strong> given
                </span>
                <span>
                  <strong>{formatMoney(coupon.stats.sales)}</strong> in sales
                </span>
                <span className="text-xs text-zinc-500">(cancelled and returned orders not counted in money)</span>
              </div>
              <ul className="max-h-40 divide-y divide-zinc-100 overflow-y-auto text-sm">
                {(detail.data?.recentOrders ?? []).map((o) => (
                  <li key={o.id} className="flex items-center gap-3 px-3 py-1.5">
                    <Link to={`/orders/${o.id}`} className="font-medium text-brand-700 hover:underline">
                      {orderNo(o.number)}
                    </Link>
                    <span className="min-w-0 flex-1 truncate text-zinc-600">{o.customerName}</span>
                    <span className={cn('text-xs', o.status === 'cancelled' || o.status === 'returned' ? 'text-red-600' : 'text-zinc-500')}>{o.status}</span>
                    <span className="tabular-nums">−{formatMoney(o.couponDiscount)}</span>
                  </li>
                ))}
                {detail.data && !detail.data.recentOrders.length && <li className="px-3 py-2 text-xs text-zinc-500">No orders yet.</li>}
              </ul>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            {coupon ? 'Save' : 'Create coupon'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
