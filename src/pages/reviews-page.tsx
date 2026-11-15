import { useState } from 'react';
import { Link } from 'react-router';
import { Check, ChevronLeft, ChevronRight, ExternalLink, MessageSquare, Search, Star, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useApproveReview, useDeleteReview, useRejectReview, useReplyReview, useReviews, type AdminReview, type ReviewStatus } from '@/hooks/use-reviews';
import { errorMessage } from '@/lib/api';
import { imageUrl, STORE_PATHS, STORE_URL } from '@/lib/store';
import { cn, formatDateTime, timeAgo } from '@/lib/utils';
import { orderNo } from '@/components/orders/labels';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input, Textarea } from '@/components/ui/input';
import { EmptyState, LoadError, Skeleton } from '@/components/ui/misc';

const TABS: { key: ReviewStatus; label: string }[] = [
  { key: 'pending', label: 'To check' },
  { key: 'approved', label: 'Shown' },
  { key: 'rejected', label: 'Not shown' },
];

/** Product reviews from customers who received the product. They show on the website once approved. */
export function ReviewsPage() {
  const [status, setStatus] = useState<ReviewStatus>('pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const reviews = useReviews(status, search, page);
  const data = reviews.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      <PageHeader title="Reviews" description="Ratings and reviews from customers who received the product. They show on the website after you approve them." />
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-zinc-200 bg-zinc-50/70 px-4 py-3 sm:flex-row sm:items-center">
          <div className="flex rounded-lg bg-zinc-200/60 p-0.5" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={status === t.key}
                onClick={() => (setStatus(t.key), setPage(1))}
                className={cn('flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium', status === t.key ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900')}
              >
                {t.label}
                {data && <span className={cn('rounded-full px-1.5 text-xs', t.key === 'pending' && data.counts.pending ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-500')}>{data.counts[t.key]}</span>}
              </button>
            ))}
          </div>
          <div className="relative sm:ml-auto sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
            <Input value={search} onChange={(e) => (setSearch(e.target.value), setPage(1))} placeholder="Product, customer or phone" className="h-9 pl-9" aria-label="Search reviews" />
          </div>
        </div>
        {reviews.isError ? (
          <LoadError message={errorMessage(reviews.error)} onRetry={() => reviews.refetch()} />
        ) : reviews.isPending ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ) : !data!.items.length ? (
          <EmptyState icon={<Star />} title={status === 'pending' ? 'Nothing to check' : 'No reviews here'} description={status === 'pending' ? 'New reviews from customers appear here.' : undefined} />
        ) : (
          <ul className={cn('divide-y divide-zinc-100', reviews.isPlaceholderData && 'opacity-60')}>
            {data!.items.map((r) => (
              <ReviewRow key={r.id} review={r} />
            ))}
          </ul>
        )}
        {data && data.total > data.pageSize && (
          <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 text-sm text-zinc-600">
            <span>
              Page {data.page} of {pages}
            </span>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="size-8" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page">
                <ChevronLeft />
              </Button>
              <Button variant="outline" size="icon" className="size-8" disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label="Next page">
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function StarRow({ value }: { value: number }) {
  return (
    <span className="flex" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn('size-4', n <= value ? 'fill-amber-400 text-amber-400' : 'text-zinc-300')} />
      ))}
    </span>
  );
}

function ReviewRow({ review: r }: { review: AdminReview }) {
  const approve = useApproveReview();
  const reject = useRejectReview();
  const reply = useReplyReview();
  const remove = useDeleteReview();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState(r.reply ?? '');
  const [deleting, setDeleting] = useState(false);
  const busy = approve.isPending || reject.isPending || remove.isPending;
  const fail = (err: unknown) => toast.error(errorMessage(err));

  return (
    <li className="flex flex-col gap-4 px-5 py-4 lg:flex-row">
      <div className="flex w-full shrink-0 items-start gap-3 lg:w-64">
        <span className="size-12 shrink-0 overflow-hidden rounded-lg bg-zinc-50 ring-1 ring-zinc-200">{r.product.image && <img src={imageUrl(r.product.image, 160)} alt="" className="size-full object-contain" />}</span>
        <div className="min-w-0 text-sm">
          <Link to={`/products/${r.product.id}`} className="line-clamp-2 font-medium text-zinc-900 hover:text-brand-700">
            {r.product.name}
          </Link>
          <a href={`${STORE_URL}${STORE_PATHS.product}${r.product.slug}/#reviews`} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-brand-700">
            On the website <ExternalLink className="size-3" />
          </a>
        </div>
      </div>
      <div className="min-w-0 flex-1 text-sm">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <StarRow value={r.rating} />
          <Link to={`/customers/${r.customer.id}`} className="font-medium text-zinc-900 hover:text-brand-700">
            {r.customer.name}
          </Link>
          <span className="text-zinc-500">{r.customer.phone}</span>
          {r.orderNumber && <span className="text-zinc-500">· bought in {orderNo(r.orderNumber)}</span>}
          <span className="text-xs text-zinc-400" title={formatDateTime(r.updatedAt)}>
            {timeAgo(r.updatedAt)}
          </span>
        </div>
        {r.body ? <p className="mt-2 whitespace-pre-line text-zinc-700">{r.body}</p> : <p className="mt-2 text-zinc-400 italic">Stars only, no text.</p>}
        {r.photos.length > 0 && (
          <div className="mt-2 flex gap-2">
            {r.photos.map((p, i) => (
              <a key={i} href={imageUrl(p, 1600)} target="_blank" rel="noopener noreferrer" className="block size-20 overflow-hidden rounded-lg ring-1 ring-zinc-200 hover:ring-brand-400">
                <img src={imageUrl(p, 160)} alt={`Photo ${i + 1}`} className="size-full object-cover" />
              </a>
            ))}
          </div>
        )}
        {r.status === 'rejected' && r.rejectReason && <p className="mt-2 text-xs text-zinc-500">Not shown because: {r.rejectReason}</p>}
        {r.reply && !replying && (
          <div className="mt-2 rounded-lg bg-zinc-50 px-3 py-2">
            <p className="text-xs font-semibold text-zinc-700">Your reply</p>
            <p className="whitespace-pre-line text-zinc-700">{r.reply}</p>
          </div>
        )}
        {replying && (
          <div className="mt-2 space-y-2">
            <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Thank you for your review…" aria-label="Your reply" autoFocus />
            <div className="flex gap-2">
              <Button
                size="sm"
                loading={reply.isPending}
                onClick={() => reply.mutate({ id: r.id, reply: text.trim() || null }, { onSuccess: () => (setReplying(false), toast.success(text.trim() ? 'Reply saved' : 'Reply removed')), onError: fail })}
              >
                Save reply
              </Button>
              <Button size="sm" variant="ghost" onClick={() => (setReplying(false), setText(r.reply ?? ''))}>
                Cancel
              </Button>
            </div>
          </div>
        )}
        {rejecting && (
          <div className="mt-2 space-y-2">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Why? (for staff only, optional)" aria-label="Why not shown" autoFocus />
            <div className="flex gap-2">
              <Button size="sm" variant="danger" loading={reject.isPending} onClick={() => reject.mutate({ id: r.id, reason: reason.trim() || null }, { onSuccess: () => toast.success('Not shown'), onError: fail })}>
                Don’t show it
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-start gap-2 lg:w-48 lg:flex-col lg:items-stretch">
        {r.status !== 'approved' && (
          <Button size="sm" disabled={busy} onClick={() => approve.mutate(r.id, { onSuccess: () => toast.success('Approved: it shows on the website'), onError: fail })}>
            <Check /> Approve
          </Button>
        )}
        {r.status !== 'rejected' && !rejecting && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setRejecting(true)}>
            <X /> {r.status === 'approved' ? 'Hide it' : 'Don’t show'}
          </Button>
        )}
        {!replying && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setReplying(true)}>
            <MessageSquare /> {r.reply ? 'Change reply' : 'Reply'}
          </Button>
        )}
        <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" disabled={busy} onClick={() => setDeleting(true)}>
          <Trash2 /> Delete
        </Button>
        {r.status === 'approved' && <Badge variant="green">Shown</Badge>}
      </div>
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Delete this review?"
        description="It is removed for good. To keep it but not show it, use “Don’t show” instead."
        confirmLabel="Delete"
        danger
        loading={remove.isPending}
        onConfirm={() => remove.mutate(r.id, { onSuccess: () => (setDeleting(false), toast.success('Review deleted')), onError: fail })}
      />
    </li>
  );
}
