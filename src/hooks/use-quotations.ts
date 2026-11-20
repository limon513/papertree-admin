import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Quotation, QuotationList, QuotationStatus } from '@/lib/types';

const KEY = ['quotations'] as const;

export const useQuotations = (filters: { status: QuotationStatus | 'all'; search?: string; page: number }) => {
  const query = new URLSearchParams({ status: filters.status, page: String(filters.page), ...(filters.search && { search: filters.search }) });
  return useQuery({ queryKey: [...KEY, 'list', filters], queryFn: () => api<QuotationList>(`/v1/admin/quotations?${query}`), placeholderData: keepPreviousData });
};

export const useQuotation = (id: number) => useQuery({ queryKey: [...KEY, 'detail', id], queryFn: () => api<Quotation>(`/v1/admin/quotations/${id}`) });

export function useCancelQuotation(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<Quotation>(`/v1/admin/quotations/${id}/cancel`, { method: 'POST' }),
    onSuccess: (q) => {
      queryClient.setQueryData([...KEY, 'detail', id], q);
      queryClient.invalidateQueries({ queryKey: [...KEY, 'list'] });
    },
  });
}
