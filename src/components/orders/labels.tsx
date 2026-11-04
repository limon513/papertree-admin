import type { OrderChannel, OrderStatus, PaymentMethod, PaymentStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

type Tone = 'gray' | 'blue' | 'green' | 'red' | 'amber' | 'violet';

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: Tone; action: string }> = {
  pending: { label: 'Pending', tone: 'amber', action: 'Back to pending' },
  confirmed: { label: 'Confirmed', tone: 'blue', action: 'Confirm' },
  packed: { label: 'Packed', tone: 'violet', action: 'Mark packed' },
  shipped: { label: 'Shipped', tone: 'blue', action: 'Mark shipped' },
  delivered: { label: 'Delivered', tone: 'green', action: 'Mark delivered' },
  cancelled: { label: 'Cancelled', tone: 'gray', action: 'Cancel order' },
  returned: { label: 'Returned', tone: 'red', action: 'Mark returned' },
};

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: Tone }> = {
  unpaid: { label: 'Unpaid', tone: 'gray' },
  partial: { label: 'Partly paid', tone: 'amber' },
  paid: { label: 'Paid', tone: 'green' },
  refunded: { label: 'Refunded', tone: 'red' },
};

export const CHANNELS: Record<OrderChannel, string> = {
  website: 'Website',
  phone: 'Phone',
  facebook: 'Facebook',
  whatsapp: 'WhatsApp',
  shop: 'Shop',
  other: 'Other',
};

export const PAYMENT_METHODS: Record<PaymentMethod, string> = {
  cod: 'Cash on delivery',
  bkash: 'bKash',
  nagad: 'Nagad',
  bank: 'Bank transfer',
  cash: 'Cash',
  card: 'Card',
  online: 'Online (SSLCommerz)',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={ORDER_STATUS[status].tone}>{ORDER_STATUS[status].label}</Badge>;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <Badge variant={PAYMENT_STATUS[status].tone}>{PAYMENT_STATUS[status].label}</Badge>;
}

/** Order numbers are shown with a #. */
export const orderNo = (n: number) => `#${n}`;
