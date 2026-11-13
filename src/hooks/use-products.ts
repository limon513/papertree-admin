import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ListResponse, Product, ProductList, ProductStatus, StockLocation, ProductBulk } from '@/lib/types';

const PRODUCTS_KEY = ['products'] as const;

export interface ProductFilters {
  search?: string;
  status?: ProductStatus;
  brandId?: number;
  categoryId?: number;
  /** Products with this website tag. */
  labelId?: number;
  stock?: 'low' | 'out';
  sort?: 'updated' | 'name' | 'price' | 'stock';
  page?: number;
}

/** What the API expects when saving. Mirrors the backend `productBody`. */
export interface ProductInput {
  name: string;
  slug?: string;
  status: ProductStatus;
  shortDescription: string | null;
  description: string | null;
  brandId: number | null;
  categoryIds: number[];
  primaryCategoryId: number | null;
  /** Website tags (badges). */
  labelIds: number[];
  tags: string[];
  imageIds: number[];
  options: { name: string; values: string[] }[];
  specs: { name: string; value: string }[];
  variants: {
    id?: number;
    option1: string | null;
    option2: string | null;
    option3: string | null;
    sku: string | null;
    barcode: string | null;
    price: number;
    salePrice: number | null;
    saleStartsAt: string | null;
    saleEndsAt: string | null;
    wholesalePrice: number | null;
    costPrice: number | null;
    weightGrams: number | null;
    imageId: number | null;
    trackStock: boolean;
    allowBackorder: boolean;
    lowStockThreshold: number | null;
    stock: { locationId: number; quantity: number; baseQuantity?: number }[];
  }[];
  seoTitle: string | null;
  seoDescription: string | null;
  bulkDiscount: ProductBulk;
}

export function useProducts(filters: ProductFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return useQuery({
    queryKey: [...PRODUCTS_KEY, 'list', filters],
    queryFn: () => api<ProductList>(`/v1/admin/products?${params}`),
    // Keep showing the current page while the next one loads.
    placeholderData: keepPreviousData,
  });
}

/** `fresh`: always load again when shown (for stock numbers that must be current). */
export function useProduct(id: number | undefined, { fresh = false }: { fresh?: boolean } = {}) {
  return useQuery({
    queryKey: [...PRODUCTS_KEY, 'detail', id],
    queryFn: () => api<Product>(`/v1/admin/products/${id}`),
    enabled: id !== undefined,
    refetchOnMount: fresh ? 'always' : true,
  });
}

export function useSaveProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: ProductInput }) =>
      id
        ? api<Product>(`/v1/admin/products/${id}`, { method: 'PUT', body: input })
        : api<Product>('/v1/admin/products', { method: 'POST', body: input }),
    onSuccess: (saved) => {
      queryClient.setQueryData([...PRODUCTS_KEY, 'detail', saved.id], saved);
      queryClient.invalidateQueries({ queryKey: [...PRODUCTS_KEY, 'list'] });
    },
  });
}

export function useDuplicateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<Product>(`/v1/admin/products/${id}/duplicate`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...PRODUCTS_KEY, 'list'] }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/v1/admin/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  });
}

export function useStockLocations() {
  return useQuery({
    queryKey: ['stock-locations'],
    queryFn: () => api<ListResponse<StockLocation>>('/v1/admin/stock-locations'),
    staleTime: 5 * 60_000,
  });
}

export type BulkAction =
  | { action: 'set-status'; status: ProductStatus }
  | { action: 'add-category' | 'remove-category'; categoryId: number }
  | { action: 'set-brand'; brandId: number | null }
  | { action: 'add-label' | 'remove-label'; labelId: number }
  | { action: 'delete' };

/** One change for many products. */
export function useBulkProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkAction & { ids: number[] }) =>
      api<{ updated: number }>('/v1/admin/products/bulk', { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  });
}

export interface StockChange {
  variantId: number;
  locationId: number;
  quantity: number;
  baseQuantity?: number;
}

/** Quick stock changes, e.g. after a delivery. */
export function useUpdateStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { changes: StockChange[]; note: string | null }) =>
      api<{ levels: { variantId: number; locationId: number; quantity: number }[] }>('/v1/admin/products/stock', {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  });
}
