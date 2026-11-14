import { useState } from 'react';
import { CheckCircle2, Truck, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import type { Order, OrderStatus } from '@/lib/types';
import { formatMoney } from '@/lib/utils';
import { orderNo } from './labels';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DialogBody, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { ErrorAlert } from '@/components/ui/misc';
import { SwitchField } from '@/components/ui/switch';

/** Steadfast's parcel statuses, in words for staff (the same as the API). */
export const COURIER_STATUS: Record<string, { label: string; variant: 'gray' | 'blue' | 'green' | 'amber' | 'red' }> = {
  sending: { label: 'Sending to Steadfast…', variant: 'gray' },
  in_review: { label: 'Waiting for Steadfast', variant: 'gray' },
  pending: { label: 'With Steadfast', variant: 'blue' },
  hold: { label: 'On hold', variant: 'amber' },
  delivered_approval_pending: { label: 'Delivered (checking)', variant: 'green' },
  partial_delivered_approval_pending: { label: 'Partly delivered (checking)', variant: 'amber' },
  cancelled_approval_pending: { label: 'Cancelled (checking)', variant: 'red' },
  unknown_approval_pending: { label: 'Unknown (checking)', variant: 'amber' },
  delivered: { label: 'Delivered', variant: 'green' },
  partial_delivered: { label: 'Partly delivered', variant: 'amber' },
  cancelled: { label: 'Cancelled, coming back', variant: 'red' },
  exceptional: { label: 'Lost or damaged', variant: 'red' },
  unknown: { label: 'Unknown', variant: 'amber' },
};

export function CourierStatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const s = COURIER_STATUS[status] ?? { label: status, variant: 'gray' as const };
  return <Badge variant={s.variant}>Steadfast: {s.label}</Badge>;
}

/** What the send needs to know about an order (list rows and the order page both have it). */
export interface SendableOrder {
  id: number;
  number: number;
  status: OrderStatus;
  customerName: string;
  total: number;
  paidAmount: number;
  advanceRequired?: number;
  consignmentId?: string | null;
}

/** Why an order cannot go yet (null: it can). The server checks again. */
export function whyNotSendable(o: SendableOrder) {
  if (o.consignmentId) return 'Already sent';
  if (o.status !== 'confirmed' && o.status !== 'packed') return o.status === 'pending' ? 'Confirm it first' : `It is ${o.status}`;
  if ((o.advanceRequired ?? 0) > o.paidAmount) return 'Advance not paid';
  return null;
}

const due = (o: SendableOrder) => Math.max(0, Math.round((o.total - o.paidAmount) * 100) / 100);

interface SendResult {
  id: number;
  number: number | null;
  ok: boolean;
  consignmentId?: string;
  trackingCode?: string;
  cod?: number;
  message: string | null;
}

export function useSendToSteadfast() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { ids: number[]; markShipped: boolean; notify: boolean }) =>
      api<{ results: SendResult[] }>('/v1/admin/orders/courier/steadfast', { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useRefreshCourier(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ status: string; changed: boolean; note: string | null; order: Order }>(`/v1/admin/orders/${id}/courier/refresh`, { method: 'POST', body: {} }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });
}

/** Send orders to Steadfast: what will go (and the cash to collect), then what happened to each. */
export function SendToSteadfastDialog({ orders, onDone }: { orders: SendableOrder[]; onDone: (sent: number) => void }) {
  const send = useSendToSteadfast();
  const [markShipped, setMarkShipped] = useState(true);
  const [notify, setNotify] = useState(true);
  const ready = orders.filter((o) => !whyNotSendable(o));
  const notReady = orders.filter((o) => whyNotSendable(o));
  const results = send.data?.results;
  const sent = results?.filter((r) => r.ok).length ?? 0;

  if (results) {
    return (
      <DialogContent title={sent ? `${sent} sent to Steadfast` : 'Nothing was sent'} description={results.length > sent ? `${results.length - sent} could not be sent: see why below.` : 'Each order now has its tracking code.'} size="md">
        <DialogBody>
          <ul className="divide-y divide-zinc-100 text-sm">
            {results.map((r) => (
              <li key={r.id} className="flex items-start gap-2.5 py-2.5">
                {r.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-600" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-red-600" />}
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-zinc-900">{r.number ? orderNo(r.number) : `Order ${r.id}`}</span>
                  {r.ok ? (
                    <span className="block text-zinc-600">
                      Tracking <span className="font-mono">{r.trackingCode ?? '—'}</span> · consignment {r.consignmentId} · collect {formatMoney(r.cod ?? 0)}
                    </span>
                  ) : null}
                  {r.message && <span className={r.ok ? 'block text-amber-700' : 'block text-red-700'}>{r.message}</span>}
                </span>
              </li>
            ))}
          </ul>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => onDone(sent)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    );
  }

  return (
    <DialogContent
      title={`Send ${ready.length} order${ready.length === 1 ? '' : 's'} to Steadfast`}
      description={ready.length ? `Cash for riders to collect: ${formatMoney(ready.reduce((s, o) => s + due(o), 0))} in all.` : 'None of these can be sent.'}
      size="md"
    >
      <DialogBody className="space-y-4">
        {ready.length > 0 && (
          <ul className="max-h-60 divide-y divide-zinc-100 overflow-y-auto rounded-lg ring-1 ring-zinc-200 text-sm">
            {ready.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="min-w-0 truncate">
                  <span className="font-medium text-zinc-900">{orderNo(o.number)}</span> <span className="text-zinc-500">· {o.customerName}</span>
                </span>
                <span className="shrink-0 text-zinc-700 tabular-nums">collect {formatMoney(due(o))}</span>
              </li>
            ))}
          </ul>
        )}
        {notReady.length > 0 && (
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <p className="font-medium">Left out ({notReady.length}):</p>
            <ul className="mt-1 space-y-0.5">
              {notReady.map((o) => (
                <li key={o.id}>
                  {orderNo(o.number)}: {whyNotSendable(o)}
                </li>
              ))}
            </ul>
          </div>
        )}
        {ready.length > 0 && (
          <>
            <SwitchField id="sf-shipped" label="Mark them shipped" description="With Steadfast and the tracking code." checked={markShipped} onCheckedChange={setMarkShipped} />
            {markShipped && <SwitchField id="sf-notify" label="Tell the customers" description="“On the way” by SMS / email (Settings → Customer messages)." checked={notify} onCheckedChange={setNotify} />}
          </>
        )}
        {send.error && <ErrorAlert message={errorMessage(send.error)} />}
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={() => onDone(0)} disabled={send.isPending}>
          Cancel
        </Button>
        <Button
          disabled={!ready.length}
          loading={send.isPending}
          onClick={() =>
            send.mutate(
              { ids: ready.map((o) => o.id), markShipped, notify: markShipped && notify },
              { onError: (err) => toast.error(errorMessage(err)) },
            )
          }
        >
          <Truck /> Send {ready.length || ''}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
