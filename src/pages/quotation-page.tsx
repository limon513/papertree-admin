import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Copy, ExternalLink, Mail, MessageCircle, MessageSquare, Pencil, Phone, Send, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useCancelQuotation, useQuotation, useQuotationMessage, useSendQuotation } from '@/hooks/use-quotations';
import { errorMessage } from '@/lib/api';
import { imageUrl } from '@/lib/store';
import { formatDateTime, formatMoney } from '@/lib/utils';
import { orderNo } from '@/components/orders/labels';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogBody, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { ErrorAlert, LoadError, Skeleton } from '@/components/ui/misc';
import type { Quotation } from '@/lib/types';
import { QUOTE_STATUS } from './quotations-page';

/** One quotation: who it is for, the lines at their fixed prices, its page link, and what came of it. */
export function QuotationPage() {
  const id = Number(useParams().id);
  const quotation = useQuotation(id);
  const cancel = useCancelQuotation(id);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);

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
            {(q.status === 'open' || q.status === 'expired') && (
              <Button variant="outline" asChild>
                <Link to={`/quotations/${q.id}/revise`}>
                  <Pencil /> Revise
                </Link>
              </Button>
            )}
            {q.status === 'open' && (
              <Button variant="outline" onClick={() => setConfirming(true)}>
                <XCircle /> Cancel quotation
              </Button>
            )}
            {q.status === 'open' && (
              <Button onClick={() => setSending(true)}>
                <Send /> Send to customer
              </Button>
            )}
          </div>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          {formatDateTime(q.createdAt)} · {q.source === 'website' ? 'made on the website' : `made by ${q.createdByName ?? 'staff'}`} · valid until {formatDateTime(q.validUntil)}
        </p>
        {q.customRequestId && (
          <p className="mt-1 text-sm text-zinc-500">
            Answers a{' '}
            <Link to="/leads?tab=custom&view=all" className="font-medium text-brand-700 hover:underline">
              custom order request
            </Link>
            .
          </p>
        )}
        {q.replaces && (
          <p className="mt-1 text-sm text-zinc-500">
            A new version of{' '}
            <Link to={`/quotations/${q.replaces.id}`} className="font-medium text-brand-700 hover:underline">
              {q.replaces.number}
            </Link>
            .
          </p>
        )}
        {q.replacedBy && (
          <p className="mt-2 rounded-md bg-sky-50 px-3 py-2 text-sm text-sky-900">
            Replaced by{' '}
            <Link to={`/quotations/${q.replacedBy.id}`} className="font-semibold underline">
              {q.replacedBy.number}
            </Link>
            . This version can no longer be ordered.
          </p>
        )}
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
            <div className="flex justify-between">
              <dt className="text-zinc-600">Delivery</dt>
              <dd className="tabular-nums">{q.deliveryFee === null ? 'Worked out when ordering' : q.deliveryFee === 0 ? 'Free' : formatMoney(q.deliveryFee)}</dd>
            </div>
            <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-semibold text-zinc-900">
              <dt>Total{q.deliveryFee === null ? ' (before delivery)' : ''}</dt>
              <dd className="tabular-nums">{formatMoney(q.subtotal + (q.deliveryFee ?? 0))}</dd>
            </div>
          </dl>
          {q.terms && (
            <div className="border-t border-zinc-200 px-5 py-4 text-sm">
              <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Terms</p>
              <p className="mt-1 whitespace-pre-line text-zinc-800">{q.terms}</p>
            </div>
          )}
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
              <CardTitle>Sent to the customer</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {q.messages.length ? (
                <ul className="space-y-2">
                  {q.messages.map((m) => (
                    <li key={m.id} className="flex items-start gap-2">
                      {m.channel === 'sms' ? <MessageSquare className="mt-0.5 size-4 shrink-0 text-zinc-400" /> : <Mail className="mt-0.5 size-4 shrink-0 text-zinc-400" />}
                      <span className="min-w-0">
                        <span className="text-zinc-800">
                          {m.channel === 'sms' ? 'SMS' : 'Email'} to {m.to}
                        </span>{' '}
                        <Badge variant={m.status === 'sent' ? 'green' : m.status === 'failed' ? 'red' : 'gray'}>{m.status === 'logged' ? 'Test mode: log only' : m.status}</Badge>
                        <span className="block text-xs text-zinc-500">
                          {formatDateTime(m.createdAt)}
                          {m.error && m.status === 'failed' ? ` · ${m.error}` : ''}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-zinc-600">Not sent yet.{q.status === 'open' ? ' “Send to customer” sends the link by SMS or email.' : ''}</p>
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
              ) : q.status === 'replaced' ? (
                <p className="text-zinc-600">Replaced by a newer version{q.replacedBy ? ` (${q.replacedBy.number})` : ''}.</p>
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

      <Dialog open={sending} onOpenChange={setSending}>
        {sending && <SendDialog q={q} onDone={() => setSending(false)} />}
      </Dialog>

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

/** Send the quotation's link: SMS to its phone, email to its address (each shown as the customer gets it). */
function SendDialog({ q, onDone }: { q: Quotation; onDone: () => void }) {
  const message = useQuotationMessage(q.id, true);
  const send = useSendQuotation(q.id);
  const [sms, setSms] = useState(true);
  const [email, setEmail] = useState(!!q.email);
  const m = message.data;
  const go = () =>
    send.mutate(
      { sms, email },
      {
        onSuccess: ({ results }) => {
          const failed = results.filter((r) => r.status === 'failed');
          const logged = results.filter((r) => r.status === 'logged');
          if (failed.length) toast.error(`Not sent: ${failed.map((r) => `${r.channel === 'sms' ? 'SMS' : 'email'} (${r.error})`).join(', ')}`);
          else if (logged.length) toast.warning('Test mode: written to the message log only, not sent.');
          else toast.success(`${q.number} sent to the customer`);
          onDone();
        },
      },
    );
  return (
    <DialogContent size="lg" title={`Send ${q.number} to ${q.name}`}>
      <DialogBody>
        {send.isError && <ErrorAlert message={errorMessage(send.error)} />}
        {!m ? (
          <Skeleton className="h-64" />
        ) : (
          <div className="space-y-4 text-sm">
            <label className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3">
              <Checkbox checked={sms} onCheckedChange={(v) => setSms(v === true)} aria-label="Send by SMS" className="mt-0.5" />
              <span className="min-w-0 flex-1">
                <span className="font-medium text-zinc-900">SMS to {m.phone}</span>
                <span className="mt-1 block rounded-md bg-zinc-50 px-3 py-2 break-words text-zinc-700">{m.sms}</span>
              </span>
            </label>
            <label className={`flex items-start gap-3 rounded-lg border border-zinc-200 p-3 ${m.email ? '' : 'opacity-60'}`}>
              <Checkbox checked={email} disabled={!m.email} onCheckedChange={(v) => setEmail(v === true)} aria-label="Send by email" className="mt-0.5" />
              <span className="min-w-0 flex-1">
                <span className="font-medium text-zinc-900">{m.email ? `Email to ${m.email}` : 'Email: no address on this quotation (revise it to add one)'}</span>
                {m.email && <span className="block text-zinc-500">{m.emailSubject}</span>}
              </span>
            </label>
            {m.email && email && <iframe title="The email" srcDoc={m.emailHtml} sandbox="" className="h-72 w-full rounded-lg border border-zinc-200 bg-zinc-100" />}
          </div>
        )}
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={send.isPending}>
          Close
        </Button>
        <Button onClick={go} loading={send.isPending} disabled={!m || (!sms && !email)}>
          <Send /> Send
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
