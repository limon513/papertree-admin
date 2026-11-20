import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { OrderType, Quotation, QuotationList, QuotationStatus } from '@/lib/types';

const KEY = ['quotations'] as const;

export const useQuotations = (filters: { status: QuotationStatus | 'all'; search?: string; page: number }) => {
  const query = new URLSearchParams({ status: filters.status, page: String(filters.page), ...(filters.search && { search: filters.search }) });
  return useQuery({ queryKey: [...KEY, 'list', filters], queryFn: () => api<QuotationList>(`/v1/admin/quotations?${query}`), placeholderData: keepPreviousData });
};

export const useQuotation = (id: number, enabled = true) => useQuery({ queryKey: [...KEY, 'detail', id], queryFn: () => api<Quotation>(`/v1/admin/quotations/${id}`), enabled });

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

export interface StaffQuotationInput {
  type: OrderType;
  customerId: number | null;
  name: string;
  organisation: string | null;
  phone: string;
  email: string | null;
  note: string | null;
  terms: string | null;
  validDays: number;
  /** Fixed delivery (0 = free); null = worked out when the customer orders. */
  deliveryFee: number | null;
  items: { variantId: number; quantity: number; unitPrice?: number; bulk?: boolean }[];
}

/** A new quotation by staff, or (with `revise`) a new version of one. */
export function useSaveQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ revise, input }: { revise?: number; input: StaffQuotationInput }) =>
      api<Quotation>(revise ? `/v1/admin/quotations/${revise}/revise` : '/v1/admin/quotations', { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export interface QuotationMessage {
  phone: string;
  email: string | null;
  sms: string;
  emailSubject: string;
  emailHtml: string;
}
export const useQuotationMessage = (id: number, enabled: boolean) =>
  useQuery({ queryKey: [...KEY, 'message', id], queryFn: () => api<QuotationMessage>(`/v1/admin/quotations/${id}/message`), enabled, gcTime: 0 });

export function useSendQuotation(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { sms: boolean; email: boolean }) =>
      api<{ results: { channel: 'sms' | 'email'; status: 'sent' | 'logged' | 'failed'; error: string | null }[]; quotation: Quotation }>(`/v1/admin/quotations/${id}/send`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: (r) => {
      queryClient.setQueryData([...KEY, 'detail', id], r.quotation);
      queryClient.invalidateQueries({ queryKey: [...KEY, 'list'] });
    },
  });
}
