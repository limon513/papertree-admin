import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Media } from '@/lib/types';

/** Product reviews: staff approve them before they show on the website. */

export type ReviewStatus = 'pending' | 'approved' | 'rejected';
type Picture = Pick<Media, 'urls' | 'width' | 'height' | 'alt'>;

export interface AdminReview {
  id: number;
  rating: number;
  body: string | null;
  photos: Picture[];
  status: ReviewStatus;
  rejectReason: string | null;
  reply: string | null;
  createdAt: string;
  updatedAt: string;
  decidedAt: string | null;
  product: { id: number; name: string; slug: string; image: Picture | null };
  customer: { id: number; name: string; phone: string };
  orderNumber: number | null;
}

const KEY = ['reviews'] as const;

export function useReviews(status: ReviewStatus, search: string, page: number) {
  const params = new URLSearchParams({ status, page: String(page) });
  if (search.trim()) params.set('search', search.trim());
  return useQuery({
    queryKey: [...KEY, status, search, page],
    queryFn: () => api<{ items: AdminReview[]; total: number; page: number; pageSize: number; counts: Record<ReviewStatus, number> }>(`/v1/admin/reviews?${params}`),
    placeholderData: keepPreviousData,
  });
}

function useReviewMutation<T>(fn: (input: T) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }) });
}

export const useApproveReview = () => useReviewMutation((id: number) => api(`/v1/admin/reviews/${id}/approve`, { method: 'POST', body: {} }));
export const useRejectReview = () => useReviewMutation(({ id, reason }: { id: number; reason: string | null }) => api(`/v1/admin/reviews/${id}/reject`, { method: 'POST', body: { reason } }));
export const useReplyReview = () => useReviewMutation(({ id, reply }: { id: number; reply: string | null }) => api(`/v1/admin/reviews/${id}/reply`, { method: 'PUT', body: { reply } }));
export const useDeleteReview = () => useReviewMutation((id: number) => api<void>(`/v1/admin/reviews/${id}`, { method: 'DELETE' }));
