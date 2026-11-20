import { useState } from 'react';
import { Link } from 'react-router';
import { AlertTriangle, Ban, CheckCircle2, Mail, PackageOpen, Send, Store, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { usePurchaseOrderPreview, useSendPurchaseOrder, useUpdatePurchaseOrder } from '@/hooks/use-orders';
import { errorMessage } from '@/lib/api';
import type { Order, PurchaseOrder, PurchaseOrderLine, ShipsTo } from '@/lib/types';
import { cn, formatDateTime } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChoiceGroup } from '@/components/ui/choice';
import { Dialog, DialogBody, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/input';
import { ErrorAlert, Skeleton } from '@/components/ui/misc';

const ACTIVE = ['confirmed', 'packed', 'shipped', 'delivered'];

/**
 * Purchase orders to brands, for products they supply: made when the order is confirmed, one per
 * brand. Staff choose who the brand delivers to, add a note, look over the email and send it.
 */
export function PurchaseOrdersCard({ order }: { order: Order }) {
  const [sending, setSending] = useState<{ po: PurchaseOrder; kind: 'order' | 'cancel' } | null>(null);
  if (!order.purchaseOrders.length && !order.suppliedWithoutBrand.length) return null;
  const active = ACTIVE.includes(order.status);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PackageOpen className="size-4 text-zinc-500" /> Purchase orders to brands
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {order.purchaseOrders.length === 0 && !active && (
          <p className="text-zinc-600">Some products here are supplied by their brand. Purchase orders are made when the order is confirmed.</p>
        )}
        {order.suppliedWithoutBrand.length > 0 && (
          <p className="flex gap-2 rounded-md bg-red-50 px-3 py-2 text-red-800">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              {lineList(order.suppliedWithoutBrand)} {order.suppliedWithoutBrand.length === 1 ? 'is' : 'are'} marked “Supplied by the brand” but{' '}
              {order.suppliedWithoutBrand.length === 1 ? 'has' : 'have'} no brand, so no purchase order can be made. Set the brand on the product.
            </span>
          </p>
        )}
        {order.purchaseOrders.map((po) => (
          <PurchaseOrderBox key={po.id} order={order} po={po} onSend={(kind) => setSending({ po, kind })} />
        ))}
      </CardContent>
      <Dialog open={sending !== null} onOpenChange={(open) => !open && setSending(null)}>
        {sending && <SendDialog order={order} po={sending.po} kind={sending.kind} onDone={() => setSending(null)} />}
      </Dialog>
    </Card>
  );
}

const lineList = (lines: PurchaseOrderLine[]) => lines.map((l) => l.name).join(', ');

function PurchaseOrderBox({ order, po, onSend }: { order: Order; po: PurchaseOrder; onSend: (kind: 'order' | 'cancel') => void }) {
  const update = useUpdatePurchaseOrder(order.id);
  const [note, setNote] = useState(po.note ?? '');
  const active = ACTIVE.includes(order.status);
  const editable = po.status !== 'cancelled' && active;
  const noteChanged = (note.trim() || null) !== po.note;

  const save = (input: { shipTo?: ShipsTo; note?: string | null }, message: string) =>
    update.mutate({ poId: po.id, ...input }, { onSuccess: () => toast.success(message), onError: (err) => toast.error(errorMessage(err)) });

  return (
    <section className="rounded-xl border border-zinc-200" aria-label={`${po.number} to ${po.brandName}`}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
        <div className="min-w-0">
          <div className="font-semibold text-zinc-900">
            {po.brandName} <span className="font-normal text-zinc-500">· {po.number}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500">
            <Mail className="size-3.5" />
            {po.email ?? (
              <span className="text-red-700">
                No order email.{' '}
                <Link to="/brands" className="font-medium underline">
                  Add it under Brands
                </Link>
              </span>
            )}
          </div>
        </div>
        <StatusBadge po={po} />
      </header>

      <div className="space-y-3 px-4 py-3">
        <ul className="space-y-1">
          {po.lines.map((l, i) => (
            <li key={i} className="flex gap-2">
              <span className="w-10 shrink-0 text-right font-semibold text-zinc-900 tabular-nums">{l.quantity} ×</span>
              <span className="min-w-0">
                {l.name}
                {(l.variantLabel || l.sku) && <span className="text-zinc-500"> · {[l.variantLabel, l.sku].filter(Boolean).join(' · ')}</span>}
              </span>
            </li>
          ))}
          {po.lines.length === 0 && <li className="text-zinc-500">No products of this brand left in the order.</li>}
        </ul>

        {po.changedSinceSent && (
          <p className="flex gap-2 rounded-md bg-amber-50 px-3 py-2 text-amber-900">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" /> The order changed after this was sent. The list above is what the brand got: send it again.
          </p>
        )}
        {po.needsCancel && (
          <p className="flex gap-2 rounded-md bg-red-50 px-3 py-2 text-red-800">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            {active ? 'These products are no longer in the order.' : 'This order is off.'} Tell {po.brandName} not to send them.
          </p>
        )}

        {editable && (
          <>
            <div className="space-y-1.5">
              <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Brand delivers to</p>
              <ChoiceGroup
                name={`po-${po.id}-ship`}
                label={`${po.brandName} delivers to`}
                value={po.shipTo}
                disabled={update.isPending}
                onChange={(shipTo) => save({ shipTo }, shipTo === 'shop' ? 'The brand delivers to our shop' : 'The brand delivers to the customer')}
                choices={[
                  { value: 'shop', label: 'Our shop', icon: <Store /> },
                  { value: 'customer', label: 'The customer', icon: <Truck />, description: 'Their name, phone and address go in the email.' },
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`po-${po.id}-note`} className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                Note for the brand
              </label>
              <Textarea
                id={`po-${po.id}-note`}
                rows={2}
                maxLength={1000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional, e.g. who collects the cash, or how to pack"
              />
              {noteChanged && (
                <Button size="sm" variant="outline" loading={update.isPending} onClick={() => save({ note: note.trim() || null }, 'Note saved')}>
                  Save note
                </Button>
              )}
            </div>
          </>
        )}

        {po.sentAt && (
          <p className="text-xs text-zinc-500">
            Sent to {po.sentTo} · {formatDateTime(po.sentAt)}
            {po.sentByName && ` by ${po.sentByName}`}
            {po.timesSent > 1 && ` · ${po.timesSent} times`}
            {po.cancelSentAt && ` · cancelled with the brand ${formatDateTime(po.cancelSentAt)}`}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {editable && po.status === 'draft' && (
            <Button size="sm" onClick={() => onSend('order')} disabled={noteChanged}>
              <Send /> Check and send
            </Button>
          )}
          {editable && po.status === 'sent' && !po.needsCancel && (
            <Button size="sm" variant={po.changedSinceSent ? 'primary' : 'outline'} onClick={() => onSend('order')} disabled={noteChanged}>
              <Send /> Send again
            </Button>
          )}
          {po.needsCancel && (
            <Button size="sm" variant="danger" onClick={() => onSend('cancel')}>
              <Ban /> Tell the brand to cancel
            </Button>
          )}
          {noteChanged && <span className="self-center text-xs text-zinc-500">Save the note first.</span>}
        </div>
      </div>
    </section>
  );
}

function StatusBadge({ po }: { po: PurchaseOrder }) {
  if (po.status === 'cancelled') return <Badge>Cancelled with the brand</Badge>;
  if (po.status === 'sent')
    return (
      <Badge variant="green">
        <CheckCircle2 /> Sent
      </Badge>
    );
  return <Badge variant="amber">Not sent yet</Badge>;
}

/** The email as the brand will get it, then Send. */
function SendDialog({ order, po, kind, onDone }: { order: Order; po: PurchaseOrder; kind: 'order' | 'cancel'; onDone: () => void }) {
  const preview = usePurchaseOrderPreview(order.id, po.id, kind);
  const send = useSendPurchaseOrder(order.id);
  const p = preview.data;

  const go = () =>
    send.mutate(
      { poId: po.id, kind },
      {
        onSuccess: (r) => {
          const what = kind === 'order' ? `${po.number} sent to ${po.brandName}` : `${po.brandName} told to cancel ${po.number}`;
          if (r.testOnly) toast.warning(`${what}, in test mode: written to the message log only, not emailed.`);
          else toast.success(what);
          onDone();
        },
      },
    );

  return (
    <DialogContent size="lg" title={kind === 'order' ? `Send ${po.number} to ${po.brandName}` : `Cancel ${po.number} with ${po.brandName}`}>
      <DialogBody>
        {send.isError && <ErrorAlert message={errorMessage(send.error)} />}
        {preview.isError && <ErrorAlert message={errorMessage(preview.error)} />}
        {!p ? (
          <Skeleton className="h-96" />
        ) : (
          <>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-zinc-500">To</dt>
              <dd className={cn('font-medium', p.to ? 'text-zinc-900' : 'text-red-700')}>{p.to ?? 'No order email for this brand'}</dd>
              <dt className="text-zinc-500">Subject</dt>
              <dd className="text-zinc-900">{p.subject}</dd>
            </dl>
            {p.warnings.length > 0 && (
              <ul className="space-y-1.5">
                {p.warnings.map((w) => (
                  <li key={w} className="flex gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {w}
                  </li>
                ))}
              </ul>
            )}
            {/* The email itself, as the brand will see it (no scripts can run in it). */}
            <iframe title="The email" srcDoc={p.html} sandbox="" className="h-[26rem] w-full rounded-lg border border-zinc-200 bg-zinc-100" />
          </>
        )}
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={send.isPending}>
          Close
        </Button>
        <Button
          variant={kind === 'cancel' ? 'danger' : 'primary'}
          onClick={go}
          loading={send.isPending}
          disabled={!p?.to || (kind === 'order' && po.lines.length === 0)}
        >
          <Send /> {kind === 'order' ? 'Send to the brand' : 'Send the cancellation'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
