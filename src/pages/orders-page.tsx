import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ChevronLeft, ChevronRight, Plus, Search, ShoppingCart } from 'lucide-react';
import { useOrders, type OrderFilters } from '@/hooks/use-orders';
import { errorMessage } from '@/lib/api';
import type { OrderChannel, OrderStatus, OrderType, PaymentStatus } from '@/lib/types';
import { cn, formatMoney, timeAgo } from '@/lib/utils';
import { CHANNELS, orderNo, OrderStatusBadge, PAYMENT_STATUS, PaymentBadge } from '@/components/orders/labels';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { EmptyState, LoadError, Skeleton } from '@/components/ui/misc';

const TABS: { key: OrderStatus | 'open' | 'all'; label: string }[] = [
  { key: 'open', label: 'To do' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'packed', label: 'Packed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'returned', label: 'Returned' },
  { key: 'all', label: 'All' },
];

export function OrdersPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  // Filters live in the address bar, so Back and shared links keep them. "To do" is the default tab.
  const tab = (params.get('status') ?? 'open') as (typeof TABS)[number]['key'];
  const filters: OrderFilters = {
    search: params.get('search') ?? undefined,
    status: tab === 'all' ? undefined : tab,
    payment: (params.get('payment') as PaymentStatus | null) ?? undefined,
    channel: (params.get('channel') as OrderChannel | null) ?? undefined,
    type: (params.get('type') as OrderType | null) ?? undefined,
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
    page: Number(params.get('page') ?? 1),
  };
  const orders = useOrders(filters);

  const setParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(window.location.search);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  const [search, setSearch] = useState(filters.search ?? '');
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim() !== (filters.search ?? '')) setParam('search', search.trim() || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const data = orders.data;
  const items = data?.items ?? [];
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const first = data ? (data.page - 1) * data.pageSize + 1 : 0;
  const last = data ? Math.min(data.page * data.pageSize, data.total) : 0;
  const hasFilters = Boolean(filters.search || filters.payment || filters.channel || filters.type || filters.from || filters.to);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Orders from the website, phone, Facebook, WhatsApp and the shop."
        actions={
          <Button asChild>
            <Link to="/orders/new">
              <Plus /> New order
            </Link>
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex gap-1 overflow-x-auto border-b border-zinc-200 px-3 pt-2">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setParam('status', t.key === 'open' ? undefined : t.key)}
                className={cn(
                  '-mb-px flex cursor-pointer items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                  active ? 'border-brand-600 text-brand-800' : 'border-transparent text-zinc-500 hover:text-zinc-800',
                )}
              >
                {t.label}
                {data && (data.counts[t.key] ?? 0) > 0 && (
                  <span className={cn('rounded-full px-1.5 text-xs tabular-nums', active ? 'bg-brand-100 text-brand-800' : 'bg-zinc-100 text-zinc-500')}>
                    {data.counts[t.key]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="grid gap-2 border-b border-zinc-200 bg-zinc-50/70 px-4 py-3 sm:grid-cols-2 lg:grid-cols-[1fr_140px_140px_130px_150px_150px]">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Order number, phone or name"
              className="h-9 pl-9"
              aria-label="Search orders"
            />
          </div>
          <Select value={filters.payment ?? ''} onChange={(e) => setParam('payment', e.target.value || undefined)} className="h-9" aria-label="Filter by payment">
            <option value="">Any payment</option>
            {Object.entries(PAYMENT_STATUS).map(([key, p]) => (
              <option key={key} value={key}>
                {p.label}
              </option>
            ))}
          </Select>
          <Select value={filters.channel ?? ''} onChange={(e) => setParam('channel', e.target.value || undefined)} className="h-9" aria-label="Filter by source">
            <option value="">Any source</option>
            {Object.entries(CHANNELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
          <Select value={filters.type ?? ''} onChange={(e) => setParam('type', e.target.value || undefined)} className="h-9" aria-label="Filter by type">
            <option value="">Retail and wholesale</option>
            <option value="retail">Retail</option>
            <option value="wholesale">Wholesale</option>
          </Select>
          <Input type="date" value={filters.from ?? ''} onChange={(e) => setParam('from', e.target.value || undefined)} className="h-9" aria-label="From date" />
          <Input type="date" value={filters.to ?? ''} onChange={(e) => setParam('to', e.target.value || undefined)} className="h-9" aria-label="To date" />
        </div>

        {orders.isError ? (
          <LoadError message={errorMessage(orders.error)} onRetry={() => orders.refetch()} />
        ) : orders.isPending ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart />}
            title={hasFilters ? 'No orders match' : tab === 'open' ? 'Nothing to do' : 'No orders here'}
            description={hasFilters ? 'Try other filters.' : tab === 'open' ? 'Every order is delivered, cancelled or returned.' : undefined}
          />
        ) : (
          <div className={cn('overflow-x-auto transition-opacity', orders.isPlaceholderData && 'opacity-60')}>
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 text-left text-xs font-medium tracking-wide text-zinc-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Order</th>
                  <th className="px-3 py-3">Customer</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="hidden px-3 py-3 md:table-cell">Payment</th>
                  <th className="px-5 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {items.map((o) => (
                  <tr key={o.id} className="cursor-pointer hover:bg-zinc-50/70" onClick={() => navigate(`/orders/${o.id}`)}>
                    <td className="px-5 py-3">
                      <Link to={`/orders/${o.id}`} className="font-medium text-zinc-900 hover:text-brand-700" onClick={(e) => e.stopPropagation()}>
                        {orderNo(o.number)}
                      </Link>
                      <div className="text-xs text-zinc-500">
                        {timeAgo(o.createdAt)} · {CHANNELS[o.channel]}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5 font-medium text-zinc-800">
                        {o.customerName}
                        {o.type === 'wholesale' && <Badge variant="violet">Wholesale</Badge>}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {o.phone} · {o.areaName ? `${o.areaName}, ` : ''}
                        {o.districtName}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="hidden px-3 py-3 md:table-cell">
                      <PaymentBadge status={o.paymentStatus} />
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <div className="font-medium text-zinc-900 tabular-nums">{formatMoney(o.total)}</div>
                      <div className="text-xs text-zinc-500">
                        {o.items} item{o.items === 1 ? '' : 's'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.total > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3 text-sm text-zinc-600">
            <span className="tabular-nums">
              {first}–{last} of {data.total}
            </span>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="size-8" disabled={data.page <= 1} onClick={() => setParam('page', String(data.page - 1))} aria-label="Previous page">
                <ChevronLeft />
              </Button>
              <Button variant="outline" size="icon" className="size-8" disabled={data.page >= pages} onClick={() => setParam('page', String(data.page + 1))} aria-label="Next page">
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
