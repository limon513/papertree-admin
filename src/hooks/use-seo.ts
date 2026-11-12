import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

const SEO_KEY = ['seo'] as const;

export type RedirectCode = 301 | 302 | 410;
export type RedirectSource = 'manual' | 'auto' | 'old-site';

export interface Redirect {
  id: number;
  fromPath: string;
  toPath: string;
  code: RedirectCode;
  source: RedirectSource;
  note: string | null;
  hits: number;
  lastHitAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotFoundRow {
  id: number;
  path: string;
  hits: number;
  referrer: string | null;
  ignored: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
}

interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RedirectInput {
  fromPath: string;
  toPath: string;
  code: RedirectCode;
  note: string | null;
}

export const useSeoSummary = () => useQuery({ queryKey: [...SEO_KEY, 'summary'], queryFn: () => api<{ redirects: number; redirectHits: number; notFound: number }>('/v1/admin/seo/summary') });

export function useRedirects(search: string, page: number) {
  const params = new URLSearchParams({ page: String(page) });
  if (search.trim()) params.set('search', search.trim());
  return useQuery({ queryKey: [...SEO_KEY, 'redirects', search, page], queryFn: () => api<Page<Redirect>>(`/v1/admin/seo/redirects?${params}`), placeholderData: keepPreviousData });
}

export function useNotFound(view: 'open' | 'ignored', page: number) {
  return useQuery({ queryKey: [...SEO_KEY, 'not-found', view, page], queryFn: () => api<Page<NotFoundRow>>(`/v1/admin/seo/not-found?view=${view}&page=${page}`), placeholderData: keepPreviousData });
}

function useSeoMutation<T, R>(fn: (input: T) => Promise<R>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries({ queryKey: SEO_KEY }) });
}

export const useSaveRedirect = () =>
  useSeoMutation(({ id, input }: { id?: number; input: RedirectInput }) =>
    api<Redirect>(id ? `/v1/admin/seo/redirects/${id}` : '/v1/admin/seo/redirects', { method: id ? 'PUT' : 'POST', body: input }),
  );
export const useDeleteRedirect = () => useSeoMutation((id: number) => api<void>(`/v1/admin/seo/redirects/${id}`, { method: 'DELETE' }));
export const useImportRedirects = () =>
  useSeoMutation((lines: string) => api<{ saved: number; problems: { line: number; text: string; message: string }[] }>('/v1/admin/seo/redirects/import', { method: 'POST', body: { lines } }));
export const useIgnoreNotFound = () => useSeoMutation(({ id, ignored }: { id: number; ignored: boolean }) => api<NotFoundRow>(`/v1/admin/seo/not-found/${id}/ignore`, { method: 'POST', body: { ignored } }));
