import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  CustomerLookup,
  DeliveryQuote,
  ListResponse,
  Order,
  OrderChannel,
  OrderList,
  OrderStatus,
  OrderType,
  OrderVariant,
  PaymentMethod,
  PaymentStatus,
} from '@/lib/types';

const ORDERS_KEY = ['orders'] as const;

export interface OrderFilters {
  search?: string;
  status?: OrderStatus | 'open';
  payment?: PaymentStatus;
  channel?: OrderChannel;
  type?: OrderType;
  from?: string;
  to?: string;
  page: number;
}

export function useOrders(filters: OrderFilters) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value !== undefined && value !== '') query.set(key, String(value));
  return useQuery({
    queryKey: [...ORDERS_KEY, 'list', filters],
    queryFn: () => api<OrderList>(`/v1/admin/orders?${query}`),
    placeholderData: keepPreviousData,
  });
}

export function useOrder(id: number | undefined) {
  return useQuery({
    queryKey: [...ORDERS_KEY, 'detail', id],
    queryFn: () => api<Order>(`/v1/admin/orders/${id}`),
    enabled: id !== undefined,
  });
}

export interface OrderInput {
  type: OrderType;
  channel: OrderChannel;
  paymentMethod: PaymentMethod;
  customer: { name: string; phone: string; email: string | null };
  districtId: string;
  areaId: string | null;
  address: string;
  items: { variantId: number; quantity: number; unitPrice?: number }[];
  discount: number;
  deliveryFee: number | null;
  customerNote: string | null;
  staffNote: string | null;
}

/** After any change: the order itself, the lists, and product stock. */
function useOrderSaved() {
  const queryClient = useQueryClient();
  return (order: Order) => {
    queryClient.setQueryData([...ORDERS_KEY, 'detail', order.id], order);
    queryClient.invalidateQueries({ queryKey: [...ORDERS_KEY, 'list'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };
}

export function useSaveOrder() {
  const saved = useOrderSaved();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: OrderInput }) =>
      api<Order>(id ? `/v1/admin/orders/${id}` : '/v1/admin/orders', { method: id ? 'PUT' : 'POST', body: input }),
    onSuccess: saved,
  });
}

export function useSetOrderStatus(id: number) {
  const saved = useOrderSaved();
  return useMutation({
    mutationFn: (input: { status: OrderStatus; note?: string | null; courier?: string | null; trackingCode?: string | null; collectDue?: boolean }) =>
      api<Order>(`/v1/admin/orders/${id}/status`, { method: 'POST', body: input }),
    onSuccess: saved,
  });
}

export function useAddPayment(id: number) {
  const saved = useOrderSaved();
  return useMutation({
    mutationFn: (input: { method: PaymentMethod; amount: number; reference: string | null; note: string | null }) =>
      api<Order>(`/v1/admin/orders/${id}/payments`, { method: 'POST', body: input }),
    onSuccess: saved,
  });
}

export function useAddOrderNote(id: number) {
  const saved = useOrderSaved();
  return useMutation({
    mutationFn: (note: string) => api<Order>(`/v1/admin/orders/${id}/notes`, { method: 'POST', body: { note } }),
    onSuccess: saved,
  });
}

export function useSetCourier(id: number) {
  const saved = useOrderSaved();
  return useMutation({
    mutationFn: (input: { courier: string | null; trackingCode: string | null }) =>
      api<Order>(`/v1/admin/orders/${id}/courier`, { method: 'PUT', body: input }),
    onSuccess: saved,
  });
}

export function useVariantSearch(q: string) {
  return useQuery({
    queryKey: [...ORDERS_KEY, 'variant-search', q],
    queryFn: () => api<ListResponse<OrderVariant>>(`/v1/admin/orders/variant-search?q=${encodeURIComponent(q)}`),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

/** Looks up a customer once the phone number is complete (11 digits). */
export function useCustomerLookup(phone: string) {
  const digits = phone.replace(/\D/g, '').replace(/^880/, '0');
  return useQuery({
    queryKey: [...ORDERS_KEY, 'customer', digits],
    queryFn: () => api<CustomerLookup>(`/v1/admin/orders/customer-lookup?phone=${digits}`),
    enabled: /^0\d{10}$/.test(digits),
    staleTime: 30_000,
  });
}

export interface OrderPriceInput {
  type: 'retail' | 'wholesale';
  items: { variantId: number; quantity: number; unitPrice?: number; bulk?: boolean }[];
}

export interface OrderPrices {
  lines: {
    variantId: number;
    quantity: number;
    basePrice: number;
    unitPrice: number;
    lineTotal: number;
    bulkPercent: number | null;
    bulkDiscount: number;
    bulkNext: { more: number; percent: number } | null;
  }[];
  subtotal: number;
  bulkDiscount: number;
}

/** The order's prices from the server, as the order will be saved (bulk discounts included). */
export function useOrderPrices(input: OrderPriceInput) {
  return useQuery({
    queryKey: [...ORDERS_KEY, 'prices', input],
    queryFn: () => api<OrderPrices>('/v1/admin/orders/price', { method: 'POST', body: input }),
    enabled: input.items.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export interface OrderQuoteInput {
  districtId: string;
  areaId: string | null;
  subtotal: number;
  weightKg: number;
  wholesale: boolean;
}

/** Delivery charge for the order being entered. */
export function useOrderDeliveryQuote(input: OrderQuoteInput) {
  return useQuery({
    queryKey: [...ORDERS_KEY, 'quote', input],
    queryFn: () => api<DeliveryQuote>('/v1/admin/orders/delivery-quote', { method: 'POST', body: input }),
    enabled: input.districtId !== '',
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
