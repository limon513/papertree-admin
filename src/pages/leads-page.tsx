import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Check, ChevronLeft, ChevronRight, Inbox, MessageCircle, Phone, RotateCcw, Search, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { canOpen, useMe } from '@/hooks/use-auth';
import { useProductRequests, useUpdateProductRequest } from '@/hooks/use-search';
import { errorMessage } from '@/lib/api';
import type { ProductRequest } from '@/lib/types';
import { cn, formatDateTime, timeAgo } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogBody, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/input';
import { EmptyState, ErrorAlert, LoadError, Skeleton } from '@/components/ui/misc';

const VIEWS = [
  { key: 'new', label: 'New' },
  { key: 'done', label: 'Done' },
  { key: 'all', label: 'All' },
] as const;
type View = (typeof VIEWS)[number]['key'];

/** Requests & Leads. For now: "Request this product" from the website. */
export function LeadsPage() {
  const [params, setParams] = useSearchParams();
  const view: View = VIEWS.find((v) => v.key === params.get('view'))?.key ?? 'new';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const requests = useProductRequests(view, page);
  const update = useUpdateProductRequest();
  const me = useMe();
  const canSeeCustomers = !!me.data && canOpen(me.data.admin, 'customers');
  const [closing, setClosing] = useState<ProductRequest | null>(null);

  const data = requests.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const go = (next: { view?: View; page?: number }) => {
    const v = next.view ?? view;
    const p = next.page ?? 1;
    setParams({ ...(v !== 'new' && { view: v }), ...(p > 1 && { page: String(p) }) });
  };
  const reopen = (r: ProductRequest) =>
    update.mutate(
      { id: r.id, status: 'new', staffNote: r.staffNote },
      { onSuccess: () => toast.success('Moved back to New'), onError: (err) => toast.error(errorMessage(err)) },
    );

  return (
    <div>
      <PageHeader
        title="Requests & Leads"
        description="Products shoppers asked for on the website when their search found nothing. Call them back, then mark the request done."
      />

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50/70 px-4 py-3">
          <div className="flex rounded-lg bg-zinc-200/60 p-0.5" role="group" aria-label="Show">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => go({ view: v.key })}
                aria-pressed={view === v.key}
                className={cn(
                  'flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors',
                  view === v.key ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900',
                )}
              >
                {v.label}
                {v.key !== 'all' && data && (
                  <span className={cn('rounded-full px-1.5 text-xs tabular-nums', v.key === 'new' && data.counts.new ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-500')}>
                    {data.counts[v.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
          <span className="text-sm text-zinc-500">{data ? `${data.total} request${data.total === 1 ? '' : 's'}` : ''}</span>
        </div>

        {requests.isError ? (
          <LoadError message={errorMessage(requests.error)} onRetry={() => requests.refetch()} />
        ) : requests.isPending ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState
            icon={<Inbox />}
            title={view === 'new' ? 'No new requests' : 'Nothing here'}
            description="When a search on the website finds nothing, shoppers can tell you what they need. Their requests show up here."
          />
        ) : (
          <ul className={cn('divide-y divide-zinc-100', requests.isPlaceholderData && 'opacity-60')}>
            {data.items.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-zinc-900">{r.details}</p>
                  {r.query && r.query.toLowerCase() !== r.details.toLowerCase() && (
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-zinc-500">
                      <Search className="size-3.5" /> Searched “{r.query}”
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="flex items-center gap-1.5 text-zinc-800">
                      <UserRound className="size-3.5 text-zinc-400" />
                      {r.customerId && canSeeCustomers ? (
                        <Link to={`/customers/${r.customerId}`} className="text-brand-700 hover:underline">
                          {r.name}
                        </Link>
                      ) : (
                        r.name
                      )}
                    </span>
                    <a href={`tel:${r.phone}`} className="flex items-center gap-1.5 text-zinc-800 hover:text-brand-700">
                      <Phone className="size-3.5 text-zinc-400" /> {r.phone}
                    </a>
                    <a
                      href={`https://wa.me/88${r.phone}?text=${encodeURIComponent(`Hello ${r.name}, this is PaperTree about your request for "${r.details}".`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-zinc-800 hover:text-brand-700"
                    >
                      <MessageCircle className="size-3.5 text-zinc-400" /> WhatsApp
                    </a>
                    <span className="text-zinc-500" title={formatDateTime(r.createdAt)}>
                      {timeAgo(r.createdAt)}
                    </span>
                  </div>
                  {r.status === 'done' && (
                    <p className="mt-2 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
                      {r.staffNote && <span className="text-zinc-800">{r.staffNote} · </span>}
                      Done by {r.handledBy ?? 'staff'}, {timeAgo(r.handledAt)}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {r.status === 'new' ? (
                    <Button size="sm" onClick={() => setClosing(r)}>
                      <Check /> Mark done
                    </Button>
                  ) : (
                    <>
                      <Badge variant="green">Done</Badge>
                      <Button size="sm" variant="ghost" onClick={() => reopen(r)} disabled={update.isPending}>
                        <RotateCcw /> New again
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 text-sm">
            <span className="text-zinc-500">
              Page {page} of {pages}
            </span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => go({ page: page - 1 })} aria-label="Previous page">
                <ChevronLeft />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => go({ page: page + 1 })} aria-label="Next page">
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={!!closing} onOpenChange={(open) => !open && setClosing(null)}>
        {closing && <DoneForm key={closing.id} request={closing} onDone={() => setClosing(null)} />}
      </Dialog>
    </div>
  );
}

function DoneForm({ request, onDone }: { request: ProductRequest; onDone: () => void }) {
  const update = useUpdateProductRequest();
  const [note, setNote] = useState(request.staffNote ?? '');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    update.mutate(
      { id: request.id, status: 'done', staffNote: note.trim() || null },
      {
        onSuccess: () => {
          toast.success('Request done');
          onDone();
        },
      },
    );
  };
  return (
    <DialogContent title="Mark request done" description={`${request.name} asked for “${request.details}”.`}>
      <form onSubmit={submit} noValidate>
        <DialogBody>
          {update.isError && <ErrorAlert message={errorMessage(update.error)} />}
          <Field label="Note (optional)" htmlFor="request-note" hint="What you told them, for the rest of the team.">
            <Textarea id="request-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} placeholder="Ordered from the supplier, called back. Comes next week." />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" loading={update.isPending}>
            <Check /> Mark done
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
