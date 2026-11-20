import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SupplierLead, SupplierLeadList, SupplierLeadStatus } from '@/lib/types';

const KEY = ['supplier-leads'] as const;

/** "Sell with us" leads from the website. */
export const useSupplierLeads = (status: SupplierLeadStatus | 'all', page: number) =>
  useQuery({
    queryKey: [...KEY, status, page],
    queryFn: () => api<SupplierLeadList>(`/v1/admin/supplier-leads?status=${status}&page=${page}`),
    placeholderData: keepPreviousData,
  });

export function useUpdateSupplierLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, staffNote }: { id: number; status: SupplierLeadStatus; staffNote: string | null }) =>
      api<SupplierLead>(`/v1/admin/supplier-leads/${id}`, { method: 'PUT', body: { status, staffNote } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
