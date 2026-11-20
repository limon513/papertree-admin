import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CustomRequest, CustomRequestList, CustomRequestStatus } from '@/lib/types';

const KEY = ['custom-requests'] as const;

/** "Custom order" requests from the website. */
export const useCustomRequests = (status: CustomRequestStatus | 'all', page: number) =>
  useQuery({
    queryKey: [...KEY, status, page],
    queryFn: () => api<CustomRequestList>(`/v1/admin/custom-requests?status=${status}&page=${page}`),
    placeholderData: keepPreviousData,
  });

export const useCustomRequest = (id: number | null) =>
  useQuery({ queryKey: [...KEY, 'one', id], queryFn: () => api<CustomRequest>(`/v1/admin/custom-requests/${id}`), enabled: id !== null });

export function useUpdateCustomRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, staffNote }: { id: number; status: CustomRequestStatus; staffNote: string | null }) =>
      api<CustomRequest>(`/v1/admin/custom-requests/${id}`, { method: 'PUT', body: { status, staffNote } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
