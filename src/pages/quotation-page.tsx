import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Copy, ExternalLink, MessageCircle, Phone, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useCancelQuotation, useQuotation } from '@/hooks/use-quotations';
import { errorMessage } from '@/lib/api';
import { imageUrl } from '@/lib/store';
import { formatDateTime, formatMoney } from '@/lib/utils';
import { orderNo } from '@/components/orders/labels';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LoadError, Skeleton } from '@/components/ui/misc';
import { QUOTE_STATUS } from './quotations-page';

/** One quotation: who it is for, the lines at their fixed prices, its page link, and what came of it. */
export function QuotationPage() {
  const id = Number(useParams().id);
  const quotation = useQuotation(id);
  const cancel = useCancelQuotation(id);
  const [confirming, setConfirming] = useState(false);

  if (quotation.isError) return <LoadError message={errorMessage(quotation.error)} onRetry={() => quotation.refetch()} />;
  if (quotation.isPending) return <Skeleton className="h-96" />;
  const q = quotation.data;
  const pieces = q.items.reduce((n, i) => n + i.quantity, 0);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(q.link);
      toast.success('Link copied: send it to the customer');
    } catch {
      toast.error('Could not copy. Open the page and copy its address.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to="/quotations" className="mb-1 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800">
          <ArrowLeft className="size-4" /> Quotations
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Quotation {q.number}</h1>
            <Badge variant={QUOTE_STATUS[q.status].badge}>{QUOTE_STATUS[q.status].label}</Badge>
            {q.type === 'wholesale' && <Badge variant="violet">Wholesale prices</Badge>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <a href={q.link} target="_blank" rel="noopener noreferrer">
                <ExternalLink /> Open the customer’s page
              </a>
            </Button>
            <Button variant="outline" onClick={() => void copy()}>
              <Copy /> Copy link
            </Button>
            {q.status === 'open' && (
              <Button variant="outline" onClick={() => setConfirming(true)}>
                <XCircle /> Cancel quotation
              </Button>
            )}
          </div>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          {formatDateTime(q.createdAt)} · {q.source === 'website' ? 'made on the website' : `made by ${q.createdByName ?? 'staff'}`} · valid until {formatDateTime(q.validUntil)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Items (prices fixed)</CardTitle>
          </CardHeader>
          <ul className="divide-y divide-zinc-100 border-t border-zinc-200">
            {q.items.map((i) => (
              <li key={i.id} className="flex items-center gap-3 px-5 py-3">
                <div className="size-12 shrink-0 overflow-hidden rounded-md bg-zinc-100">{i.image && <img src={imageUrl(i.image, 160)} alt="" className="size-full object-cover" />}</div>
                <div className="min-w-0 flex-1">
                  {i.productId ? (
                    <Link to={`/products/${i.productId}`} className="font-medium text-zinc-900 hover:text-brand-700">
                      {i.name}
                    </Link>
                  ) : (
                    <span className="font-medium text-zinc-900">{i.name}</span>
                  )}
                  <div className="text-xs text-zinc-500">{[i.variantLabel, i.sku].filter(Boolean).join(' · ')}</div>
                </div>
                <div className="text-right text-sm whitespace-nowrap text-zinc-600 tabular-nums">
                  {i.quantity} × {formatMoney(i.unitPrice)}
                  {i.bulkPercent ? <div className="text-xs text-brand-700">Bulk {i.bulkPercent}%: −{formatMoney(i.bulkDiscount)}</div> : null}
                </div>
                <div className="w-24 text-right font-medium text-zinc-900 tabular-nums">{formatMoney(i.lineTotal)}</div>
              </li>
            ))}
          </ul>
          <dl className="space-y-1.5 border-t border-zinc-200 bg-zinc-50/50 px-5 py-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-600">
                {q.items.length} products, {pieces} pieces
              </dt>
            </div>
            {q.bulkDiscount > 0 && (
              <div className="flex justify-between text-xs text-brand-700">
                <dt>Bulk discounts (included)</dt>
                <dd className="tabular-nums">−{formatMoney(q.bulkDiscount)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-semibold text-zinc-900">
              <dt>Total (before delivery)</dt>
              <dd className="tabular-nums">{formatMoney(q.subtotal)}</dd>
            </div>
          </dl>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>For</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="font-medium text-zinc-900">{q.organisation ?? q.name}</div>
              {q.organisation && <div className="text-zinc-700">{q.name}</div>}
              <a href={`tel:${q.phone}`} className="flex items-center gap-1.5 text-brand-700 hover:underline">
                <Phone className="size-3.5" /> {q.phone}
              </a>
              <a
                href={`https://wa.me/88${q.phone}?text=${encodeURIComponent(`Hello ${q.name}, this is PaperTree about your quotation ${q.number}: ${q.link}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-brand-700 hover:underline"
              >
                <MessageCircle className="size-3.5" /> WhatsApp with the link
              </a>
              {q.email && <div className="text-zinc-600">{q.email}</div>}
              {q.customerId && (
                <Link to={`/customers/${q.customerId}`} className="block text-xs text-zinc-500 hover:underline">
                  Signed-in customer: see their account
                </Link>
              )}
              {q.note && (
                <p className="rounded-md bg-zinc-100 px-3 py-2 text-zinc-700">
                  <span className="font-medium">Reference:</span> {q.note}
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>What came of it</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {q.order ? (
                <p>
                  Ordered {q.orderedAt && formatDateTime(q.orderedAt)} as{' '}
                  <Link to={`/orders/${q.order.id}`} className="font-semibold text-brand-700 hover:underline">
                    order {orderNo(q.order.number)}
                  </Link>
                  , at these prices.
                </p>
              ) : q.status === 'cancelled' ? (
                <p className="text-zinc-600">Cancelled {q.cancelledAt && formatDateTime(q.cancelledAt)}. It can no longer be ordered.</p>
              ) : q.status === 'expired' ? (
                <p className="text-zinc-600">Expired without an order. The customer can make a new one at today’s prices.</p>
              ) : (
                <p className="text-zinc-600">Not ordered yet. The customer can order it on its page until it expires. A call may help.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        danger
        loading={cancel.isPending}
        onConfirm={() =>
          cancel.mutate(undefined, {
            onSuccess: () => {
              toast.success(`${q.number} cancelled`);
              setConfirming(false);
            },
            onError: (err) => toast.error(errorMessage(err)),
          })
        }
        title={`Cancel ${q.number}?`}
        description="The customer will no longer be able to order it at these prices. This cannot be undone."
        confirmLabel="Cancel quotation"
      />
    </div>
  );
}
