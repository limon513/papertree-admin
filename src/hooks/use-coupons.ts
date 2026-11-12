import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Coupon, CouponDetail, CouponState, CouponType } from '@/lib/types';

const COUPONS_KEY = ['coupons'] as const;

/** What the API expects. Mirrors the backend `couponBody`. */
export interface CouponInput {
  code: string;
  note: string | null;
  type: CouponType;
  value: number | null;
  maxDiscount: number | null;
  minOrder: number | null;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  newCustomersOnly: boolean;
  phone: string | null;
  items: { productIds: number[]; categoryIds: number[]; brandIds: number[] };
  onSaleItems: boolean;
  withBulk: boolean;
  isActive: boolean;
}

export function useCoupons(view: CouponState | 'all', search: string) {
  const params = new URLSearchParams({ view });
  if (search.trim()) params.set('search', search.trim());
  return useQuery({ queryKey: [...COUPONS_KEY, view, search], queryFn: () => api<{ items: Coupon[] }>(`/v1/admin/coupons?${params}`) });
}

export function useCoupon(id: number | null) {
  return useQuery({ queryKey: [...COUPONS_KEY, 'one', id], queryFn: () => api<CouponDetail>(`/v1/admin/coupons/${id}`), enabled: id !== null });
}

export function useSaveCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: CouponInput }) => api<Coupon>(id ? `/v1/admin/coupons/${id}` : '/v1/admin/coupons', { method: id ? 'PUT' : 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COUPONS_KEY }),
  });
}

export function useSwitchCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => api<Coupon>(`/v1/admin/coupons/${id}/active`, { method: 'POST', body: { active } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COUPONS_KEY }),
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/v1/admin/coupons/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COUPONS_KEY }),
  });
}
