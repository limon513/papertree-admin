import { useEffect } from 'react';
import { useParams } from 'react-router';
import { Printer } from 'lucide-react';
import { useOrder } from '@/hooks/use-orders';
import { useStoreInfo } from '@/hooks/use-settings';
import { errorMessage } from '@/lib/api';
import { imageUrl } from '@/lib/store';
import { formatMoney } from '@/lib/utils';
import { orderNo, PAYMENT_METHODS } from '@/components/orders/labels';
import { Button } from '@/components/ui/button';
import { LoadError, Spinner } from '@/components/ui/misc';

const date = (value: string) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** A4 invoice, also used as the packing slip: opens in its own tab, outside the admin layout. */
export function OrderInvoicePage() {
  const id = Number(useParams().id);
  const order = useOrder(id);
  const info = useStoreInfo();

  useEffect(() => {
    if (order.data) document.title = `Invoice ${orderNo(order.data.number)}`;
  }, [order.data]);

  if (order.isError || info.isError) {
    return <LoadError message={errorMessage(order.error ?? info.error)} onRetry={() => (order.refetch(), info.refetch())} />;
  }
  if (order.isPending || info.isPending) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  const o = order.data;
  const { store, logo } = info.data;
  const due = Math.max(0, Math.round((o.total - o.paidAmount) * 100) / 100);

  return (
    <div className="min-h-dvh bg-zinc-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] justify-end px-4 print:hidden">
        <Button onClick={() => window.print()}>
          <Printer /> Print
        </Button>
      </div>
      <article className="mx-auto max-w-[210mm] bg-white p-10 text-sm text-zinc-800 shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b border-zinc-200 pb-6">
          <div className="flex items-start gap-4">
            {logo && <img src={imageUrl(logo, 400)} alt="" className="h-16 w-auto object-contain" />}
            <div>
              <div className="text-xl font-semibold text-zinc-900">{store.name}</div>
              {store.address && <div className="max-w-xs text-zinc-600">{store.address}</div>}
              <div className="text-zinc-600">{[store.phone, store.email].filter(Boolean).join(' · ')}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold tracking-tight text-zinc-900">Invoice</div>
            <div className="text-base font-medium">{orderNo(o.number)}</div>
            <div className="text-zinc-600">{date(o.createdAt)}</div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-6 py-6">
          <div>
            <div className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Deliver to</div>
            <div className="mt-1 text-base font-medium text-zinc-900">{o.customerName}</div>
            <div className="font-medium">{o.phone}</div>
            <div className="text-zinc-700">{o.address}</div>
            <div className="text-zinc-700">{[o.areaName, o.districtName].filter(Boolean).join(', ')}</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Payment</div>
            <div className="mt-1">{PAYMENT_METHODS[o.paymentMethod]}</div>
            {o.courier && (
              <div className="mt-2 text-zinc-600">
                {o.courier}
                {o.trackingCode && ` · ${o.trackingCode}`}
              </div>
            )}
            {o.type === 'wholesale' && <div className="mt-2 font-medium">Wholesale order</div>}
          </div>
        </section>

        <table className="w-full">
          <thead>
            <tr className="border-y border-zinc-300 text-left text-xs tracking-wide text-zinc-500 uppercase">
              <th className="py-2 pr-2">#</th>
              <th className="py-2 pr-2">Item</th>
              <th className="py-2 pr-2 text-right">Price</th>
              <th className="py-2 pr-2 text-right">Qty</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {o.items.map((i, n) => (
              <tr key={i.id} className="align-top">
                <td className="py-2 pr-2 text-zinc-500">{n + 1}</td>
                <td className="py-2 pr-2">
                  <div className="font-medium text-zinc-900">{i.name}</div>
                  <div className="text-xs text-zinc-500">{[i.variantLabel, i.sku].filter(Boolean).join(' · ')}</div>
                </td>
                <td className="py-2 pr-2 text-right tabular-nums">{formatMoney(i.unitPrice)}</td>
                <td className="py-2 pr-2 text-right tabular-nums">{i.quantity}</td>
                <td className="py-2 text-right tabular-nums">{formatMoney(i.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <dl className="w-64 space-y-1">
            <Line label="Subtotal" value={formatMoney(o.subtotal)} />
            {o.discount > 0 && <Line label="Discount" value={`− ${formatMoney(o.discount)}`} />}
            <Line label="Delivery" value={o.deliveryFee === 0 ? 'Free' : formatMoney(o.deliveryFee)} />
            <div className="flex justify-between border-t border-zinc-300 pt-1 text-base font-semibold text-zinc-900">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatMoney(o.total)}</dd>
            </div>
            {o.paidAmount !== 0 && <Line label="Paid" value={formatMoney(o.paidAmount)} />}
            <div className="mt-2 flex justify-between rounded border-2 border-zinc-900 px-2 py-1 text-base font-bold text-zinc-900">
              <dt>{due > 0 ? 'Cash to collect' : 'Paid in full'}</dt>
              <dd className="tabular-nums">{due > 0 ? formatMoney(due) : ''}</dd>
            </div>
          </dl>
        </div>

        {o.customerNote && (
          <p className="mt-6 rounded border border-zinc-200 px-3 py-2">
            <span className="font-medium">Note:</span> {o.customerNote}
          </p>
        )}

        <footer className="mt-10 border-t border-zinc-200 pt-4 text-center text-xs text-zinc-500">
          Thank you for shopping with {store.name}.{store.whatsapp && ` Questions? WhatsApp ${store.whatsapp}.`}
        </footer>
      </article>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-zinc-600">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
