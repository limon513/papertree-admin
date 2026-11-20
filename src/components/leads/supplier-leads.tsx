import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { Check, ChevronLeft, ChevronRight, ExternalLink, Handshake, Mail, MapPin, MessageCircle, MessagesSquare, Phone, RotateCcw, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useSupplierLeads, useUpdateSupplierLead } from '@/hooks/use-supplier-leads';
import { errorMessage } from '@/lib/api';
import type { SupplierLead, SupplierLeadStatus, SupplierWay } from '@/lib/types';
import { cn, formatDateTime, timeAgo } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogBody, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/input';
import { EmptyState, ErrorAlert, LoadError, Skeleton } from '@/components/ui/misc';

const VIEWS = [
  { key: 'new', label: 'New' },
  { key: 'talking', label: 'In talks' },
  { key: 'done', label: 'Done' },
  { key: 'all', label: 'All' },
] as const;
type View = (typeof VIEWS)[number]['key'];

export const WAYS: Record<SupplierWay, string> = {
  wholesale: 'Supplies us (wholesale)',
  brand: 'We list, they supply per order',
  unsure: 'Not sure yet',
};

/** "Sell with us": brands and suppliers who want to sell through the shop. Talk to them, then close with a note. */
export function SupplierLeadsPanel() {
  const [params, setParams] = useSearchParams();
  const view: View = VIEWS.find((v) => v.key === params.get('view'))?.key ?? 'new';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const leads = useSupplierLeads(view, page);
  const update = useUpdateSupplierLead();
  const [closing, setClosing] = useState<SupplierLead | null>(null);

  const data = leads.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const go = (next: { view?: View; page?: number }) => {
    const v = next.view ?? view;
    const p = next.page ?? 1;
    setParams({ tab: 'suppliers', ...(v !== 'new' && { view: v }), ...(p > 1 && { page: String(p) }) });
  };
  const move = (l: SupplierLead, status: SupplierLeadStatus, message: string) =>
    update.mutate({ id: l.id, status, staffNote: l.staffNote }, { onSuccess: () => toast.success(message), onError: (err) => toast.error(errorMessage(err)) });

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
              className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors',
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
        <span className="hidden text-sm text-zinc-500 sm:block">{data ? `${data.total} lead${data.total === 1 ? '' : 's'}` : ''}</span>
      </div>

      {leads.isError ? (
        <LoadError message={errorMessage(leads.error)} onRetry={() => leads.refetch()} />
      ) : leads.isPending ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : !data?.items.length ? (
        <EmptyState
          icon={<Handshake />}
          title={view === 'new' ? 'No new leads' : 'Nothing here'}
          description="Brands and suppliers who fill in “Sell with us” on the website show up here."
        />
      ) : (
        <ul className={cn('divide-y divide-zinc-100', leads.isPlaceholderData && 'opacity-60')}>
          {data.items.map((l) => (
            <li key={l.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start" aria-label={l.businessName}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-zinc-900">{l.businessName}</p>
                  {l.ways.map((w) => (
                    <Badge key={w} variant={w === 'brand' ? 'violet' : w === 'wholesale' ? 'blue' : 'gray'}>
                      {WAYS[w]}
                    </Badge>
                  ))}
                </div>
                <p className="mt-1 text-sm whitespace-pre-line text-zinc-800">{l.products}</p>
                {l.message && <p className="mt-1.5 rounded-lg bg-zinc-50 px-3 py-2 text-sm whitespace-pre-line text-zinc-600">{l.message}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="flex items-center gap-1.5 text-zinc-800">
                    <UserRound className="size-3.5 text-zinc-400" /> {l.contactName}
                  </span>
                  <a href={`tel:${l.phone}`} className="flex items-center gap-1.5 text-zinc-800 hover:text-brand-700">
                    <Phone className="size-3.5 text-zinc-400" /> {l.phone}
                  </a>
                  <a
                    href={`https://wa.me/88${l.phone}?text=${encodeURIComponent(`Hello ${l.contactName}, this is PaperTree about selling ${l.businessName} products with us.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-zinc-800 hover:text-brand-700"
                  >
                    <MessageCircle className="size-3.5 text-zinc-400" /> WhatsApp
                  </a>
                  {l.email && (
                    <a href={`mailto:${l.email}`} className="flex items-center gap-1.5 text-zinc-800 hover:text-brand-700">
                      <Mail className="size-3.5 text-zinc-400" /> {l.email}
                    </a>
                  )}
                  {l.location && (
                    <span className="flex items-center gap-1.5 text-zinc-600">
                      <MapPin className="size-3.5 text-zinc-400" /> {l.location}
                    </span>
                  )}
                  {l.link && (
                    <a href={l.link} target="_blank" rel="noopener noreferrer nofollow" className="flex max-w-xs items-center gap-1.5 truncate text-brand-700 hover:underline">
                      <ExternalLink className="size-3.5 shrink-0" /> {l.link.replace(/^https?:\/\/(www\.)?/, '')}
                    </a>
                  )}
                  <span className="text-zinc-500" title={formatDateTime(l.createdAt)}>
                    {timeAgo(l.createdAt)}
                  </span>
                </div>
                {l.status !== 'new' && (
                  <p className="mt-2 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
                    {l.staffNote && <span className="text-zinc-800">{l.staffNote} · </span>}
                    {l.status === 'done' ? 'Done' : 'Picked up'} by {l.handledBy ?? 'staff'}, {timeAgo(l.handledAt)}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {l.status === 'new' && (
                  <Button size="sm" variant="outline" onClick={() => move(l, 'talking', `${l.businessName}: in talks`)} disabled={update.isPending}>
                    <MessagesSquare /> In talks
                  </Button>
                )}
                {l.status === 'talking' && <Badge variant="blue">In talks</Badge>}
                {l.status !== 'done' ? (
                  <Button size="sm" onClick={() => setClosing(l)}>
                    <Check /> Done
                  </Button>
                ) : (
                  <>
                    <Badge variant="green">Done</Badge>
                    <Button size="sm" variant="ghost" onClick={() => move(l, 'new', 'Moved back to New')} disabled={update.isPending}>
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

      <Dialog open={!!closing} onOpenChange={(open) => !open && setClosing(null)}>
        {closing && <DoneForm key={closing.id} lead={closing} onDone={() => setClosing(null)} />}
      </Dialog>
    </Card>
  );
}

function DoneForm({ lead, onDone }: { lead: SupplierLead; onDone: () => void }) {
  const update = useUpdateSupplierLead();
  const [note, setNote] = useState(lead.staffNote ?? '');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    update.mutate(
      { id: lead.id, status: 'done', staffNote: note.trim() || null },
      {
        onSuccess: () => {
          toast.success(`${lead.businessName}: done`);
          onDone();
        },
      },
    );
  };
  return (
    <DialogContent title={`Done with ${lead.businessName}`} description="What came of it, for the rest of the team.">
      <form onSubmit={submit} noValidate>
        <DialogBody>
          {update.isError && <ErrorAlert message={errorMessage(update.error)} />}
          <Field label="Note (optional)" htmlFor="lead-note">
            <Textarea
              id="lead-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Agreed: 15 notebooks, listed and supplied per order, they deliver to our shop. / Not a fit: prices too high."
            />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" loading={update.isPending}>
            <Check /> Done
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
