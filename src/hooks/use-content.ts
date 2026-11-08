import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Banner, BannerPlacement } from '@/lib/types';

const BANNERS_KEY = ['banners'] as const;

export interface BannerInput {
  placement: BannerPlacement;
  title: string;
  imageId: number | null;
  mobileImageId: number | null;
  linkUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
}

export const useBanners = () => useQuery({ queryKey: BANNERS_KEY, queryFn: () => api<Banner[]>('/v1/admin/banners') });

export function useSaveBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: BannerInput }) =>
      api<Banner>(id ? `/v1/admin/banners/${id}` : '/v1/admin/banners', { method: id ? 'PUT' : 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BANNERS_KEY }),
  });
}

export function useDeleteBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/v1/admin/banners/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BANNERS_KEY }),
  });
}

/** New order of one place; the list is updated at once and then from the server. */
export function useReorderBanners() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => api<Banner[]>('/v1/admin/banners/order', { method: 'PUT', body: { ids } }),
    onMutate: (ids) => {
      const before = queryClient.getQueryData<Banner[]>(BANNERS_KEY);
      if (before) queryClient.setQueryData(BANNERS_KEY, before.map((b) => (ids.includes(b.id) ? { ...b, sortOrder: ids.indexOf(b.id) } : b)));
      return { before };
    },
    onError: (_err, _ids, ctx) => ctx?.before && queryClient.setQueryData(BANNERS_KEY, ctx.before),
    onSuccess: (all) => queryClient.setQueryData(BANNERS_KEY, all),
  });
}
