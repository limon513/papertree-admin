import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  BdLocations,
  CheckoutSettings,
  DeliveryQuote,
  DeliveryZone,
  ListResponse,
  SettingsResponse,
  StockLocationRow,
  StoreSettings,
} from '@/lib/types';

const SETTINGS_KEY = ['settings'] as const;
const ZONES_KEY = ['delivery-zones'] as const;
const LOCATIONS_KEY = ['settings', 'stock-locations'] as const;

export function useSettings() {
  return useQuery({ queryKey: SETTINGS_KEY, queryFn: () => api<SettingsResponse>('/v1/admin/settings') });
}

export function useSaveStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StoreSettings) => api<StoreSettings>('/v1/admin/settings/store', { method: 'PUT', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SETTINGS_KEY }),
  });
}

export function useSaveCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CheckoutSettings) => api<CheckoutSettings>('/v1/admin/settings/checkout', { method: 'PUT', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SETTINGS_KEY }),
  });
}

/** Districts and areas never change, so they are loaded once. */
export function useBdLocations() {
  return useQuery({
    queryKey: ['bd-locations'],
    queryFn: () => api<BdLocations>('/v1/admin/settings/locations'),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

// ---- Delivery zones ----

export type ZoneInput = Omit<DeliveryZone, 'id' | 'isDefault' | 'sortOrder'>;

export function useDeliveryZones() {
  return useQuery({ queryKey: ZONES_KEY, queryFn: () => api<ListResponse<DeliveryZone>>('/v1/admin/settings/delivery-zones') });
}

export function useSaveZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: ZoneInput }) =>
      api<DeliveryZone>(id ? `/v1/admin/settings/delivery-zones/${id}` : '/v1/admin/settings/delivery-zones', {
        method: id ? 'PUT' : 'POST',
        body: input,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ZONES_KEY }),
  });
}

export function useDeleteZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/v1/admin/settings/delivery-zones/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ZONES_KEY }),
  });
}

export interface QuoteInput {
  districtId: string;
  areaId: string | null;
  subtotal: number;
  weightKg: number;
  wholesale: boolean;
}

export function useDeliveryQuote() {
  return useMutation({
    mutationFn: (input: QuoteInput) => api<DeliveryQuote>('/v1/admin/settings/delivery-quote', { method: 'POST', body: input }),
  });
}

// ---- Stock locations ----

export function useStockLocationRows() {
  return useQuery({
    queryKey: LOCATIONS_KEY,
    queryFn: () => api<ListResponse<StockLocationRow>>('/v1/admin/settings/stock-locations'),
  });
}

/** The product form lists active locations, so refresh that list too. */
function useRefreshLocations() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: LOCATIONS_KEY });
    queryClient.invalidateQueries({ queryKey: ['stock-locations'] });
  };
}

export function useSaveStockLocation() {
  const refresh = useRefreshLocations();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: { name: string; isActive: boolean } }) =>
      api<StockLocationRow>(id ? `/v1/admin/settings/stock-locations/${id}` : '/v1/admin/settings/stock-locations', {
        method: id ? 'PUT' : 'POST',
        body: input,
      }),
    onSuccess: refresh,
  });
}

export function useMakeDefaultLocation() {
  const refresh = useRefreshLocations();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/v1/admin/settings/stock-locations/${id}/default`, { method: 'POST' }),
    onSuccess: refresh,
  });
}

export function useDeleteStockLocation() {
  const refresh = useRefreshLocations();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/v1/admin/settings/stock-locations/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });
}
