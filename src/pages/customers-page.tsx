import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ChevronLeft, ChevronRight, Plus, Search, Users } from 'lucide-react';
import { useCustomers, type CustomerFilters, type CustomerSort, type CustomerView } from '@/hooks/use-customers';
import { errorMessage } from '@/lib/api';
import { cn, formatMoney, timeAgo } from '@/lib/utils';
import { CustomerBadges } from '@/components/customers/customer-badges';
import { CustomerDialog } from '@/components/customers/customer-dialogs';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input, Select } from '@/components/ui/input';
import { EmptyState, LoadError, Skeleton } from '@/components/ui/misc';

const VIEWS: { key: CustomerView; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'retail', label: 'Retail' },
  { key: 'business', label: 'Business' },
  { key: 'pending', label: 'Business requests' },
  { key: 'blocked', label: 'Blocked' },
];

const SORTS: { key: CustomerSort; label: string }[] = [
  { key: 'newest', label: 'Newest first' },
  { key: 'last_order', label: 'Last order' },
  { key: 'spent', label: 'Spent most' },
  { key: 'orders', label: 'Most orders' },
  { key: 'name', label: 'Name A–Z' },
];

export function CustomersPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [adding, setAdding] = useState(false);

  const filters: CustomerFilters = {
    search: params.get('search') ?? undefined,
    view: (params.get('view') as CustomerView | null) ?? 'all',
    sort: (params.get('sort') as CustomerSort | null) ?? 'newest',
    page: Number(params.get('page') ?? 1),
  };
  const customers = useCustomers(filters);

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

  const data = customers.data;
  const items = data?.items ?? [];
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const first = data ? (data.page - 1) * data.pageSize + 1 : 0;
  const last = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Everyone who ordered, business accounts and their terms."
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus /> Add customer
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex gap-1 overflow-x-auto border-b border-zinc-200 px-3 pt-2">
          {VIEWS.map((v) => {
            const active = filters.view === v.key;
            const n = data?.counts[v.key] ?? 0;
            return (
              <button
                key={v.key}
                type="button"
                onClick={() => setParam('view', v.key === 'all' ? undefined : v.key)}
                className={cn(
                  '-mb-px flex cursor-pointer items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                  active ? 'border-brand-600 text-brand-800' : 'border-transparent text-zinc-500 hover:text-zinc-800',
                )}
              >
                {v.label}
                {data && (n > 0 || v.key === 'all') && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 text-xs tabular-nums',
                      v.key === 'pending' && n > 0 ? 'bg-amber-100 text-amber-800' : active ? 'bg-brand-100 text-brand-800' : 'bg-zinc-100 text-zinc-500',
                    )}
                  >
                    {n}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="grid gap-2 border-b border-zinc-200 bg-zinc-50/70 px-4 py-3 sm:grid-cols-[1fr_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, phone, email or business"
              className="h-9 pl-9"
              aria-label="Search customers"
            />
          </div>
          <Select value={filters.sort} onChange={(e) => setParam('sort', e.target.value === 'newest' ? undefined : e.target.value)} className="h-9" aria-label="Sort">
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>

        {customers.isError ? (
          <LoadError message={errorMessage(customers.error)} onRetry={() => customers.refetch()} />
        ) : customers.isPending ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title={filters.search ? 'No customers match' : filters.view === 'pending' ? 'No business requests' : 'No customers here'}
            description={filters.view === 'pending' ? 'Requests from the website sign-up will show here.' : undefined}
          />
        ) : (
          <div className={cn('overflow-x-auto transition-opacity', customers.isPlaceholderData && 'opacity-60')}>
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 text-left text-xs font-medium tracking-wide text-zinc-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-3 py-3 text-right">Orders</th>
                  <th className="hidden px-3 py-3 text-right sm:table-cell">Spent</th>
                  <th className="hidden px-3 py-3 text-right md:table-cell">Still owed</th>
                  <th className="hidden px-5 py-3 lg:table-cell">Last order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {items.map((c) => (
                  <tr key={c.id} className="cursor-pointer hover:bg-zinc-50/70" onClick={() => navigate(`/customers/${c.id}`)}>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link to={`/customers/${c.id}`} className="font-medium text-zinc-900 hover:text-brand-700" onClick={(e) => e.stopPropagation()}>
                          {c.businessName && c.type === 'business' ? c.businessName : c.name}
                        </Link>
                        <CustomerBadges customer={c} />
                      </div>
                      <div className="text-xs text-zinc-500">
                        {c.businessName && c.type === 'business' && c.businessName !== c.name ? `${c.name} · ` : ''}
                        {c.phone}
                        {c.email && ` · ${c.email}`}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{c.orders}</td>
                    <td className="hidden px-3 py-3 text-right tabular-nums sm:table-cell">{formatMoney(c.spent)}</td>
                    <td className={cn('hidden px-3 py-3 text-right tabular-nums md:table-cell', c.due > 0 ? 'text-red-700' : 'text-zinc-400')}>
                      {c.due > 0 ? formatMoney(c.due) : '—'}
                    </td>
                    <td className="hidden px-5 py-3 text-zinc-500 lg:table-cell">{c.lastOrderAt ? timeAgo(c.lastOrderAt) : 'Never'}</td>
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

      <Dialog open={adding} onOpenChange={setAdding}>
        {adding && (
          <CustomerDialog
            customer={null}
            onDone={(saved) => {
              setAdding(false);
              if (saved) navigate(`/customers/${saved.id}`);
            }}
          />
        )}
      </Dialog>
    </div>
  );
}
