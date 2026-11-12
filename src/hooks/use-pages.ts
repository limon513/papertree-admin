import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

const KEY = ['pages'] as const;

export interface ContentPage {
  id: number;
  slug: string;
  title: string;
  body: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  isPublished: boolean;
  showInFooter: boolean;
  showContact: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PageInput {
  title: string;
  slug?: string;
  body: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  isPublished: boolean;
  showInFooter: boolean;
  showContact: boolean;
}

export const usePages = () => useQuery({ queryKey: KEY, queryFn: () => api<{ items: ContentPage[] }>('/v1/admin/pages') });

function useM<T, R>(fn: (input: T) => Promise<R>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }) });
}

export const useSavePage = () => useM(({ id, input }: { id?: number; input: PageInput }) => api<ContentPage>(id ? `/v1/admin/pages/${id}` : '/v1/admin/pages', { method: id ? 'PUT' : 'POST', body: input }));
export const useDeletePage = () => useM((id: number) => api<void>(`/v1/admin/pages/${id}`, { method: 'DELETE' }));
export const useReorderPages = () => useM((ids: number[]) => api<{ items: ContentPage[] }>('/v1/admin/pages', { method: 'PUT', body: { ids } }));
export const useCopyOldPages = () => useM((site: string) => api<{ copied: string[]; skipped: string[] }>('/v1/admin/pages/copy-old-site', { method: 'POST', body: { site } }));
