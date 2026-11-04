import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { BusinessStatus, Customer, CustomerList, WholesaleTerms } from '@/lib/types';

const CUSTOMERS_KEY = ['customers'] as const;

export type CustomerView = 'all' | 'retail' | 'business' | 'pending' | 'blocked';
export type CustomerSort = 'newest' | 'last_order' | 'spent' | 'orders' | 'name';

export interface CustomerFilters {
  search?: string;
  view: CustomerView;
  sort: CustomerSort;
  page: number;
}

export function useCustomers(filters: CustomerFilters) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value !== undefined && value !== '') query.set(key, String(value));
  return useQuery({
    queryKey: [...CUSTOMERS_KEY, 'list', filters],
    queryFn: () => api<CustomerList>(`/v1/admin/customers?${query}`),
    placeholderData: keepPreviousData,
  });
}

export function useCustomer(id: number) {
  return useQuery({ queryKey: [...CUSTOMERS_KEY, 'detail', id], queryFn: () => api<Customer>(`/v1/admin/customers/${id}`) });
}

export interface CustomerInput {
  name: string;
  phone: string;
  email: string | null;
  type: 'retail' | 'business';
  businessName: string | null;
  tradeLicense: string | null;
  note: string | null;
}

export interface AddressInput {
  label: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  districtId: string;
  areaId: string | null;
  address: string;
  isDefault: boolean;
}

/** Every change returns the whole customer: store it, refresh the list, and the order lookups. */
function useCustomerChange<T>(request: (input: T) => Promise<Customer>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: (customer) => {
      queryClient.setQueryData([...CUSTOMERS_KEY, 'detail', customer.id], customer);
      queryClient.invalidateQueries({ queryKey: [...CUSTOMERS_KEY, 'list'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'customer'] });
    },
  });
}

export const useSaveCustomer = () =>
  useCustomerChange(({ id, input }: { id?: number; input: CustomerInput }) =>
    api<Customer>(id ? `/v1/admin/customers/${id}` : '/v1/admin/customers', { method: id ? 'PUT' : 'POST', body: input }),
  );

export const useSetBusiness = (id: number) =>
  useCustomerChange((input: { status: BusinessStatus; terms: WholesaleTerms | null }) =>
    api<Customer>(`/v1/admin/customers/${id}/business`, { method: 'PUT', body: input }),
  );

export const useSetBlocked = (id: number) =>
  useCustomerChange((input: { blocked: boolean; reason: string | null }) =>
    api<Customer>(`/v1/admin/customers/${id}/block`, { method: 'PUT', body: input }),
  );

export const useSaveAddress = (customerId: number) =>
  useCustomerChange(({ id, input }: { id?: number; input: AddressInput }) =>
    api<Customer>(id ? `/v1/admin/customers/${customerId}/addresses/${id}` : `/v1/admin/customers/${customerId}/addresses`, {
      method: id ? 'PUT' : 'POST',
      body: input,
    }),
  );

export const useDeleteAddress = (customerId: number) =>
  useCustomerChange((id: number) => api<Customer>(`/v1/admin/customers/${customerId}/addresses/${id}`, { method: 'DELETE' }));
