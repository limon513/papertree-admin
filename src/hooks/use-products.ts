import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ListResponse, Product, ProductList, ProductStatus, StockLocation } from '@/lib/types';

const PRODUCTS_KEY = ['products'] as const;

export interface ProductFilters {
  search?: string;
  status?: ProductStatus;
  brandId?: number;
  categoryId?: number;
  sort?: 'updated' | 'name' | 'price';
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

export function useProduct(id: number | undefined) {
  return useQuery({
    queryKey: [...PRODUCTS_KEY, 'detail', id],
    queryFn: () => api<Product>(`/v1/admin/products/${id}`),
    enabled: id !== undefined,
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
