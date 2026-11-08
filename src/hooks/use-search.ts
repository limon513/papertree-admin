import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ProductRequest, ProductRequestList, ProductRequestStatus, SearchReport, SynonymGroup } from '@/lib/types';

// ---- Search words (synonyms) ----

const SYNONYMS_KEY = ['search-synonyms'] as const;

export const useSynonyms = () => useQuery({ queryKey: SYNONYMS_KEY, queryFn: () => api<SynonymGroup[]>('/v1/admin/search-synonyms') });

export function useSaveSynonym() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, terms }: { id?: number; terms: string[] }) =>
      api<SynonymGroup>(id ? `/v1/admin/search-synonyms/${id}` : '/v1/admin/search-synonyms', { method: id ? 'PUT' : 'POST', body: { terms } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SYNONYMS_KEY }),
  });
}

export function useDeleteSynonym() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/v1/admin/search-synonyms/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SYNONYMS_KEY }),
  });
}

// ---- Search report ----

export const useSearchReport = (days: number) =>
  useQuery({
    queryKey: ['search-report', days],
    queryFn: () => api<SearchReport>(`/v1/admin/search-report?days=${days}`),
    placeholderData: keepPreviousData,
  });

// ---- Product requests ----

const REQUESTS_KEY = ['product-requests'] as const;

export const useProductRequests = (status: ProductRequestStatus | 'all', page: number) =>
  useQuery({
    queryKey: [...REQUESTS_KEY, status, page],
    queryFn: () => api<ProductRequestList>(`/v1/admin/product-requests?status=${status}&page=${page}`),
    placeholderData: keepPreviousData,
  });

export function useUpdateProductRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, staffNote }: { id: number; status: ProductRequestStatus; staffNote: string | null }) =>
      api<ProductRequest>(`/v1/admin/product-requests/${id}`, { method: 'PUT', body: { status, staffNote } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: REQUESTS_KEY }),
  });
}
