import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Check, ChevronLeft, ChevronRight, FileText, Hammer, Image, Mail, MapPin, MessageCircle, Phone, RotateCcw, UserRound, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { canOpen, useMe } from '@/hooks/use-auth';
import { useCustomRequests, useUpdateCustomRequest } from '@/hooks/use-custom-requests';
import { errorMessage } from '@/lib/api';
import type { CustomRequest } from '@/lib/types';
import { cn, formatDateTime, formatMoney, timeAgo } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogBody, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/input';
import { EmptyState, ErrorAlert, LoadError, Skeleton } from '@/components/ui/misc';

const VIEWS = [
  { key: 'new', label: 'New' },
  { key: 'quoted', label: 'Quoted' },
  { key: 'closed', label: 'Closed' },
  { key: 'all', label: 'All' },
] as const;
type View = (typeof VIEWS)[number]['key'];

/**
 * "Custom order" requests from the website's Custom Order Studio: what to make, how many, artwork.
 * Call the customer, then "Make a quotation" (a custom item at the agreed price); close it with a note.
 */
export function CustomRequestsPanel() {
  const [params, setParams] = useSearchParams();
  const view: View = VIEWS.find((v) => v.key === params.get('view'))?.key ?? 'new';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const list = useCustomRequests(view, page);
  const update = useUpdateCustomRequest();
  const me = useMe();
  const canQuote = !!me.data && canOpen(me.data.admin, 'orders');
  const [closing, setClosing] = useState<CustomRequest | null>(null);

  const data = list.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const go = (next: { view?: View; page?: number }) => {
    const v = next.view ?? view;
    const p = next.page ?? 1;
    setParams({ tab: 'custom', ...(v !== 'new' && { view: v }), ...(p > 1 && { page: String(p) }) });
  };
  const reopen = (r: CustomRequest) =>
    update.mutate({ id: r.id, status: 'new', staffNote: r.staffNote }, { onSuccess: () => toast.success('Moved back to New'), onError: (err) => toast.error(errorMessage(err)) });

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50/70 px-4 py-3">
        <div className="flex overflow-x-auto rounded-lg bg-zinc-200/60 p-0.5" role="group" aria-label="Show">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => go({ view: v.key })}
              aria-pressed={view === v.key}
              className={cn('flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors', view === v.key ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900')}
            >
              {v.label}
              {v.key !== 'all' && data && (
                <span className={cn('rounded-full px-1.5 text-xs tabular-nums', v.key === 'new' && data.counts.new ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-500')}>{data.counts[v.key]}</span>
              )}
            </button>
          ))}
        </div>
        <span className="hidden text-sm text-zinc-500 sm:block">{data ? `${data.total} request${data.total === 1 ? '' : 's'}` : ''}</span>
      </div>

      {list.isError ? (
        <LoadError message={errorMessage(list.error)} onRetry={() => list.refetch()} />
      ) : list.isPending ? (
        <div className="space-y-3 p-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : !data?.items.length ? (
        <EmptyState icon={<Hammer />} title={view === 'new' ? 'No new custom requests' : 'Nothing here'} description="Customers describe what they want made in the website's Custom Order Studio. Their requests show up here." />
      ) : (
        <ul className={cn('divide-y divide-zinc-100', list.isPlaceholderData && 'opacity-60')}>
          {data.items.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-start" aria-label={r.number}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-zinc-900">
                    {r.kindName} × {r.quantity.toLocaleString('en-US')}
                  </p>
                  <span className="text-sm text-zinc-500">{r.number}</span>
                  {r.status === 'quoted' && <Badge variant="blue">Quoted</Badge>}
                  {r.status === 'closed' && <Badge variant="green">Closed</Badge>}
                </div>
                <dl className="mt-2 grid gap-x-6 gap-y-0.5 text-sm sm:grid-cols-2">
                  {r.specs.map((s) => (
                    <div key={s.label} className="flex gap-2">
                      <dt className="shrink-0 text-zinc-500">{s.label}:</dt>
                      <dd className="text-zinc-800">{s.value}</dd>
                    </div>
                  ))}
                </dl>
                {r.notes && <p className="mt-2 rounded-lg bg-zinc-50 px-3 py-2 text-sm whitespace-pre-line text-zinc-700">{r.notes}</p>}
                {r.files.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {r.files.map((f) => (
                      <li key={f.id}>
                        <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-brand-800 ring-1 ring-brand-200 hover:bg-brand-50">
                          {f.contentType === 'application/pdf' ? <FileText className="size-4" /> : <Image className="size-4" />}
                          {f.fileName}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="flex items-center gap-1.5 text-zinc-800">
                    <UserRound className="size-3.5 text-zinc-400" /> {r.name}
                  </span>
                  <a href={`tel:${r.phone}`} className="flex items-center gap-1.5 text-zinc-800 hover:text-brand-700">
                    <Phone className="size-3.5 text-zinc-400" /> {r.phone}
                  </a>
                  <a
                    href={`https://wa.me/88${r.phone}?text=${encodeURIComponent(`Hello ${r.name}, this is PaperTree about your custom order ${r.number} (${r.kindName}).`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-zinc-800 hover:text-brand-700"
                  >
                    <MessageCircle className="size-3.5 text-zinc-400" /> WhatsApp
                  </a>
                  {r.email && (
                    <a href={`mailto:${r.email}`} className="flex items-center gap-1.5 text-zinc-800 hover:text-brand-700">
                      <Mail className="size-3.5 text-zinc-400" /> {r.email}
                    </a>
                  )}
                  {r.city && (
                    <span className="flex items-center gap-1.5 text-zinc-600">
                      <MapPin className="size-3.5 text-zinc-400" /> {r.city}
                    </span>
                  )}
                  <span className="text-zinc-500" title={formatDateTime(r.createdAt)}>
                    {timeAgo(r.createdAt)}
                  </span>
                </div>
                {r.quotations.length > 0 && (
                  <p className="mt-2 text-sm text-zinc-600">
                    Quotation{r.quotations.length === 1 ? '' : 's'}:{' '}
                    {r.quotations.map((q, i) => (
                      <span key={q.id}>
                        {i > 0 && ', '}
                        <Link to={`/quotations/${q.id}`} className="font-medium text-brand-700 hover:underline">
                          {q.number}
                        </Link>{' '}
                        ({q.status}, {formatMoney(q.subtotal)})
                      </span>
                    ))}
                  </p>
                )}
                {r.status === 'closed' && (
                  <p className="mt-2 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
                    {r.staffNote && <span className="text-zinc-800">{r.staffNote} · </span>}
                    Closed by {r.handledByName ?? 'staff'}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {canQuote && r.status !== 'closed' && (
                  <Button size="sm" asChild>
                    <Link to={`/quotations/new?request=${r.id}`}>Make a quotation</Link>
                  </Button>
                )}
                {r.status !== 'closed' ? (
                  <Button size="sm" variant="outline" onClick={() => setClosing(r)}>
                    <XCircle /> Close
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => reopen(r)} disabled={update.isPending}>
                    <RotateCcw /> New again
                  </Button>
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

      <Dialog open={!!closing} onOpenChange={(open) => !open && setClosing(null)}>
        {closing && <CloseForm key={closing.id} request={closing} onDone={() => setClosing(null)} />}
      </Dialog>
    </Card>
  );
}

function CloseForm({ request, onDone }: { request: CustomRequest; onDone: () => void }) {
  const update = useUpdateCustomRequest();
  const [note, setNote] = useState(request.staffNote ?? '');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    update.mutate(
      { id: request.id, status: 'closed', staffNote: note.trim() || null },
      {
        onSuccess: () => {
          toast.success(`${request.number} closed`);
          onDone();
        },
      },
    );
  };
  return (
    <DialogContent title={`Close ${request.number}`} description={`${request.kindName} × ${request.quantity} for ${request.name}.`}>
      <form onSubmit={submit} noValidate>
        <DialogBody>
          {update.isError && <ErrorAlert message={errorMessage(update.error)} />}
          <Field label="Note (optional)" htmlFor="custom-note" hint="What came of it, for the rest of the team.">
            <Textarea id="custom-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} placeholder="Ordered, printing next week. / Not possible: minimum 500 pieces." />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" loading={update.isPending}>
            <Check /> Close
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
