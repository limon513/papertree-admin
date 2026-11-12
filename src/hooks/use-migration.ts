import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

const KEY = ['migration'] as const;

export type AddressState = 'ok' | 'redirected' | 'hidden' | 'missing';
export type AddressKind = 'product' | 'category' | 'page' | 'other';

export interface OldSiteRun {
  id: number;
  site: string;
  status: 'reading' | 'ready' | 'failed';
  step: string | null;
  productLimit: number | null;
  productsTotal: number;
  productsRead: number;
  categories: number;
  addresses: number;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
  importJob: { id: number; status: string; total: number; processed: number; created: number; skipped: number; failed: number } | null;
}

export interface OldAddress {
  id: number;
  path: string;
  kind: AddressKind;
  name: string | null;
  state: AddressState;
  redirectsTo: string | null;
  /** null: none found (yet); '': gone for good (410). */
  suggestedPath: string | null;
  suggestedName: string | null;
}

export interface AddressReport {
  counts: Partial<Record<AddressKind, Record<AddressState, number>>>;
  total: number;
  items: OldAddress[];
}

/** The last run; asks every 3 seconds while it is reading or its import is running. */
export function useMigration() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => api<{ run: OldSiteRun | null }>('/v1/admin/migration'),
    refetchInterval: (q) => {
      const run = q.state.data?.run;
      return run && (run.status === 'reading' || ['queued', 'running'].includes(run.importJob?.status ?? '')) ? 3000 : false;
    },
  });
}

export function useAddresses(state: AddressState | 'all', kind: AddressKind | 'all', page: number) {
  const params = new URLSearchParams({ page: String(page) });
  if (state !== 'all') params.set('state', state);
  if (kind !== 'all') params.set('kind', kind);
  return useQuery({ queryKey: [...KEY, 'addresses', state, kind, page], queryFn: () => api<AddressReport>(`/v1/admin/migration/addresses?${params}`), placeholderData: keepPreviousData });
}

function useM<T, R>(fn: (input: T) => Promise<R>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }) });
}

export const useReadOldSite = () => useM((input: { site: string; limit: number | null }) => api<{ run: OldSiteRun }>('/v1/admin/migration/read', { method: 'POST', body: input }));
export const useSuggest = () => useM((again: boolean) => api<{ looked: number; left: number }>('/v1/admin/migration/suggest', { method: 'POST', body: { again } }));
export const useApplySuggestions = () => useM((ids: number[] | null) => api<{ made: number; problems: string[] }>('/v1/admin/migration/apply', { method: 'POST', body: { ids } }));
