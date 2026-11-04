import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ImportDetail, ImportJob, LinkRead, ListResponse } from '@/lib/types';

const IMPORTS_KEY = ['imports'] as const;
const isActive = (job: ImportJob) => job.status === 'queued' || job.status === 'running';

export type ImportRowFilter = 'all' | 'create' | 'update' | 'skip' | 'error' | 'failed';

export interface ImportOptions {
  existing: 'skip' | 'update';
  status: 'file' | 'draft';
  createMissing: boolean;
}

export function useImports() {
  return useQuery({
    queryKey: [...IMPORTS_KEY, 'list'],
    queryFn: () => api<ListResponse<ImportJob>>('/v1/admin/imports'),
    // Keep the list moving while an import runs.
    refetchInterval: (query) => (query.state.data?.items.some(isActive) ? 3000 : false),
  });
}

export function useImport(id: number, filter: ImportRowFilter, page: number) {
  return useQuery({
    queryKey: [...IMPORTS_KEY, 'detail', id, filter, page],
    queryFn: () => api<ImportDetail>(`/v1/admin/imports/${id}?filter=${filter}&page=${page}`),
    placeholderData: keepPreviousData,
    // Refresh every 1.5 s while the import runs, to show progress.
    refetchInterval: (query) => (query.state.data && isActive(query.state.data.job) ? 1500 : false),
  });
}

export function useUploadImport() {
  const queryClient = useQueryClient();
  return useMutation({
    // Two files only for the Daraz exports (basic + price & stock).
    mutationFn: ({ files, options }: { files: File[]; options: ImportOptions }) => {
      const form = new FormData();
      for (const file of files) form.append('file', file);
      form.append('existing', options.existing);
      form.append('status', options.status);
      form.append('createMissing', String(options.createMissing));
      return api<ImportJob>('/v1/admin/imports/products', { method: 'POST', body: form });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: IMPORTS_KEY }),
  });
}

function useImportAction(action: 'start' | 'cancel') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<ImportJob>(`/v1/admin/imports/${id}/${action}`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IMPORTS_KEY });
      // New products and changed stock show up in the products list.
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export const useStartImport = () => useImportAction('start');
export const useCancelImport = () => useImportAction('cancel');

/** Reads a product page from another shop. Nothing is saved. */
export function useReadLink() {
  return useMutation({
    mutationFn: (url: string) => api<LinkRead>('/v1/admin/imports/link/read', { method: 'POST', body: { url } }),
  });
}

export interface LinkCreateInput {
  url: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  images: string[];
  brandId: number | null;
  newBrand: string | null;
  categoryIds: number[];
  tags: string[];
  specs: { name: string; value: string }[];
  options: { name: string; values: string[] }[];
  variants: { values: string[]; price: number; salePrice: number | null; image: string | null }[];
}

/** Saves the checked product as a draft. */
export function useCreateFromLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LinkCreateInput) =>
      api<{ productId: number; importId: number; note: string | null }>('/v1/admin/imports/link', { method: 'POST', body: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IMPORTS_KEY });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
  });
}
