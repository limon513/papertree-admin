import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Brand, Category, IconGroup, ListResponse, Media } from '@/lib/types';

const CATEGORIES_KEY = ['categories'] as const;
const BRANDS_KEY = ['brands'] as const;

export interface CategoryInput {
  name: string;
  /** Empty = make one from the name. */
  slug: string;
  parentId: number | null;
  description: string | null;
  imageId: number | null;
  icon: string | null;
  isActive: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface BrandInput {
  name: string;
  /** Empty = make one from the name. */
  slug: string;
  description: string | null;
  imageId: number | null;
  icon: string | null;
  isActive: boolean;
  isFeatured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
}

// ---- Categories ----

export function useCategories() {
  return useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: () => api<ListResponse<Category>>('/v1/admin/categories'),
  });
}

export function useSaveCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: CategoryInput }) =>
      id
        ? api<Category>(`/v1/admin/categories/${id}`, { method: 'PATCH', body: input })
        : api<Category>('/v1/admin/categories', { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/v1/admin/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  });
}

/** Saves a new order for the categories under one parent. The list updates at once, before the API answers. */
export function useReorderCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { parentId: number | null; ids: number[] }) =>
      api<void>('/v1/admin/categories/reorder', { method: 'POST', body: input }),
    onMutate: async ({ ids }) => {
      await queryClient.cancelQueries({ queryKey: CATEGORIES_KEY });
      queryClient.setQueryData<ListResponse<Category>>(CATEGORIES_KEY, (old) =>
        old && {
          items: old.items.map((c) => (ids.includes(c.id) ? { ...c, sortOrder: ids.indexOf(c.id) } : c)),
        },
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  });
}

// ---- Brands ----

export function useBrands() {
  return useQuery({ queryKey: BRANDS_KEY, queryFn: () => api<ListResponse<Brand>>('/v1/admin/brands') });
}

export function useSaveBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: Partial<BrandInput> }) =>
      id
        ? api<Brand>(`/v1/admin/brands/${id}`, { method: 'PATCH', body: input })
        : api<Brand>('/v1/admin/brands', { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BRANDS_KEY }),
  });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/v1/admin/brands/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BRANDS_KEY }),
  });
}

// ---- Images and icons ----

/** Uploads one image. The API saves it in several sizes and returns their URLs. */
export function useUploadImage() {
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api<Media>('/v1/admin/media', { method: 'POST', body: form });
    },
  });
}

/** The icon list never changes while the panel is open. */
export function useIcons() {
  return useQuery({
    queryKey: ['icons'],
    queryFn: () => api<{ groups: IconGroup[] }>('/v1/admin/icons'),
    staleTime: Infinity,
  });
}
