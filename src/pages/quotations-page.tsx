import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ChevronLeft, ChevronRight, FileText, Plus, Search } from 'lucide-react';
import { useQuotations } from '@/hooks/use-quotations';
import { errorMessage } from '@/lib/api';
import type { QuotationStatus } from '@/lib/types';
import { cn, formatDateTime, formatMoney, timeAgo } from '@/lib/utils';
import { orderNo } from '@/components/orders/labels';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState, LoadError, Skeleton } from '@/components/ui/misc';

const TABS: { key: QuotationStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'ordered', label: 'Ordered' },
  { key: 'expired', label: 'Expired' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'replaced', label: 'Replaced' },
];

export const QUOTE_STATUS: Record<QuotationStatus, { label: string; badge: 'green' | 'blue' | 'amber' | 'gray' }> = {
  open: { label: 'Open', badge: 'blue' },
  ordered: { label: 'Ordered', badge: 'green' },
  expired: { label: 'Expired', badge: 'amber' },
  cancelled: { label: 'Cancelled', badge: 'gray' },
  replaced: { label: 'Replaced', badge: 'gray' },
};

/** Quotations: made by shoppers from their cart (and later by staff). Who asked, for how much, and what came of it. */
export function QuotationsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.key === params.get('status'))?.key ?? 'all') as QuotationStatus | 'all';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [search, setSearch] = useState(params.get('search') ?? '');
  const list = useQuotations({ status: tab, search: params.get('search') ?? undefined, page });

  const setParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(window.location.search);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim() !== (params.get('search') ?? '')) setParam('search', search.trim() || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const data = list.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotations"
        description="Priced lists for schools, offices and shops: made by customers from their cart, or by you with special prices. Customers order them online at those prices while valid."
        actions={
          <Button asChild>
            <Link to="/quotations/new">
              <Plus /> New quotation
            </Link>
          </Button>
        }
      />
      <Card className="overflow-hidden">
        <div className="flex gap-1 overflow-x-auto border-b border-zinc-200 px-3 pt-2">
          {TABS.map((t) => {
            const active = tab === t.key;
            const n = t.key === 'all' ? null : data?.counts[t.key];
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setParam('status', t.key === 'all' ? undefined : t.key)}
                className={cn(
                  '-mb-px flex cursor-pointer items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                  active ? 'border-brand-600 text-brand-800' : 'border-transparent text-zinc-500 hover:text-zinc-800',
                )}
              >
                {t.label}
                {!!n && <span className={cn('rounded-full px-1.5 text-xs tabular-nums', active ? 'bg-brand-100 text-brand-800' : 'bg-zinc-100 text-zinc-500')}>{n}</span>}
              </button>
            );
          })}
        </div>
        <div className="border-b border-zinc-200 bg-zinc-50/70 px-4 py-3">
          <div className="relative sm:w-96">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Q-number, phone, name or school" className="h-9 pl-9" aria-label="Search quotations" />
          </div>
        </div>

        {list.isError ? (
          <LoadError message={errorMessage(list.error)} onRetry={() => list.refetch()} />
        ) : list.isPending ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : !data?.items.length ? (
          <EmptyState icon={<FileText />} title="No quotations here" description="When customers press “Get a quotation” in their cart, or you make one, it shows up here." />
        ) : (
          <div className={cn('overflow-x-auto', list.isPlaceholderData && 'opacity-60')}>
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 text-left text-xs font-medium tracking-wide text-zinc-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Quotation</th>
                  <th className="px-3 py-3">For</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="hidden px-3 py-3 md:table-cell">Valid until</th>
                  <th className="px-5 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {data.items.map((q) => (
                  <tr key={q.id} className="cursor-pointer hover:bg-zinc-50/70" onClick={() => navigate(`/quotations/${q.id}`)}>
                    <td className="px-5 py-3">
                      <Link to={`/quotations/${q.id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-zinc-900 hover:text-brand-700">
                        {q.number}
                      </Link>
                      <div className="text-xs text-zinc-500">
                        {timeAgo(q.createdAt)} · {q.source === 'website' ? 'Website' : 'Staff'}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5 font-medium text-zinc-800">
                        {q.organisation ?? q.name}
                        {q.type === 'wholesale' && <Badge variant="violet">Wholesale</Badge>}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {q.organisation ? `${q.name} · ` : ''}
                        {q.phone}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={QUOTE_STATUS[q.status].badge}>{QUOTE_STATUS[q.status].label}</Badge>
                      {q.orderNumber && <div className="mt-1 text-xs text-zinc-500">Order {orderNo(q.orderNumber)}</div>}
                    </td>
                    <td className="hidden px-3 py-3 text-zinc-600 md:table-cell" title={formatDateTime(q.validUntil)}>
                      {new Date(q.validUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <div className="font-medium text-zinc-900 tabular-nums">{formatMoney(q.subtotal)}</div>
                      <div className="text-xs text-zinc-500">
                        {q.items} piece{q.items === 1 ? '' : 's'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && pages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 text-sm text-zinc-600">
            <span>
              Page {page} of {pages}
            </span>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="size-8" disabled={page <= 1} onClick={() => setParam('page', String(page - 1))} aria-label="Previous page">
                <ChevronLeft />
              </Button>
              <Button variant="outline" size="icon" className="size-8" disabled={page >= pages} onClick={() => setParam('page', String(page + 1))} aria-label="Next page">
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
