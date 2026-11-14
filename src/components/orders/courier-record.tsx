import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '@/lib/api';
import type { CourierLevel, CourierRecordView, Order } from '@/lib/types';
import { cn, timeAgo } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * The customer's courier record (Steadfast, all merchants): how much of their parcels arrived or
 * came back, and what merchants reported. A signal for staff before confirming: never a verdict.
 */

export const LEVEL: Record<CourierLevel, { label: string; variant: 'green' | 'amber' | 'red' | 'gray'; text: string }> = {
  good: { label: 'Good record', variant: 'green', text: 'Most of their parcels arrived.' },
  watch: { label: 'Watch', variant: 'amber', text: 'Some parcels came back or a merchant reported them. Call before confirming.' },
  risky: { label: 'Risky', variant: 'red', text: 'Many parcels came back or several reports. Call first; ask for an advance if unsure.' },
  unknown: { label: 'No record yet', variant: 'gray', text: 'No finished parcels with any courier merchant yet: a new customer, not proof of a clean record.' },
};

/** A small badge for the order list (only when it needs attention). */
export function CourierLevelBadge({ level }: { level: string | null | undefined }) {
  if (level !== 'watch' && level !== 'risky') return null;
  const l = LEVEL[level];
  return (
    <Badge variant={l.variant} title={`Courier record: ${l.text}`}>
      {level === 'risky' ? 'Risky' : 'Watch'}
    </Badge>
  );
}

const words = (code: string) => code.replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase());

function useCheckNow(orderId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<CourierRecordView>(`/v1/admin/orders/${orderId}/courier-record`, { method: 'POST', body: {} }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function CourierRecordCard({ order }: { order: Order }) {
  const check = useCheckNow(order.id);
  const saved = order.courierRecord;
  if (!saved && !order.canCheckCourier) return null;
  const level = saved ? LEVEL[saved.level] : null;
  const r = saved?.record;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-zinc-400" /> Courier record
        </CardTitle>
        {level && <Badge variant={level.variant}>{level.label}</Badge>}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!saved ? (
          <p className="text-zinc-500">Not checked yet. Shows how much of this number's parcels arrived or came back, with every merchant on Steadfast.</p>
        ) : (
          <>
            <p className="text-zinc-600">{level!.text}</p>
            {(r!.deliveryRatio !== null || r!.cancellationRatio !== null) && (
              <div className="space-y-1.5">
                <Bar label="Delivered" value={r!.deliveryRatio} tone="bg-brand-600" />
                <Bar label="Came back" value={r!.cancellationRatio} tone="bg-red-500" />
              </div>
            )}
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <dt className="text-zinc-500">Parcels</dt>
              <dd className="text-zinc-800">{r!.volumeRange ?? (r!.volumeBand === 'none' || !r!.volumeBand ? 'None yet' : r!.volumeBand.replace('_', ' '))}</dd>
              {r!.deliveredCount !== null && (
                <>
                  <dt className="text-zinc-500">Delivered / came back</dt>
                  <dd className="text-zinc-800">
                    {r!.deliveredCount} / {r!.cancelledCount ?? 0}
                  </dd>
                </>
              )}
              <dt className="text-zinc-500">Reports</dt>
              <dd className={r!.totalReports ? 'font-medium text-red-700' : 'text-zinc-800'}>{r!.totalReports || 'None'}</dd>
            </dl>
            {r!.reports.length > 0 && (
              <ul className="space-y-0.5 rounded-md bg-red-50 px-2.5 py-2 text-xs text-red-900">
                {r!.reports.map((x) => (
                  <li key={x.code}>
                    {words(x.code)} × {x.times}
                  </li>
                ))}
              </ul>
            )}
            {r!.doubtfulReports && <p className="text-xs text-zinc-500">Some reports may be doubtful (Steadfast's note).</p>}
          </>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-2.5">
          <span className="text-xs text-zinc-500">{saved ? `Checked ${timeAgo(saved.checkedAt)}` : 'From Steadfast · all merchants'}</span>
          {order.canCheckCourier && (
            <Button
              size="sm"
              variant="outline"
              loading={check.isPending}
              onClick={() =>
                check.mutate(undefined, {
                  onSuccess: (v) => toast.success(`Courier record: ${LEVEL[v.level].label}`),
                  onError: (err) => toast.error(errorMessage(err)),
                })
              }
            >
              <RefreshCw /> {saved ? 'Check again' : 'Check now'}
            </Button>
          )}
        </div>
        <p className="text-[11px] leading-snug text-zinc-400">A signal, not a verdict: a cancelled parcel is not proof of anything. It never blocks an order.</p>
      </CardContent>
    </Card>
  );
}

function Bar({ label, value, tone }: { label: string; value: number | null; tone: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-zinc-600">{label}</span>
        <span className="font-medium text-zinc-900 tabular-nums">{value === null ? '—' : `${value}%`}</span>
      </div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
        <div className={cn('h-full rounded-full', tone)} style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} />
      </div>
    </div>
  );
}
