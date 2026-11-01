import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ME_KEY } from '@/lib/query-client';
import type { ListResponse, Role, Staff, StaffStatus } from '@/lib/types';

const STAFF_KEY = ['staff'] as const;
const ROLES_KEY = ['roles'] as const;

export interface StaffInput {
  name: string;
  email: string;
  roleId: number;
  status: StaffStatus;
  password?: string;
}

export interface RoleInput {
  name: string;
  description: string | null;
  modules?: string[];
  canImpersonate?: boolean;
}

export function useStaffList() {
  return useQuery({ queryKey: STAFF_KEY, queryFn: () => api<ListResponse<Staff>>('/v1/admin/staff') });
}

export function useRoles() {
  return useQuery({ queryKey: ROLES_KEY, queryFn: () => api<ListResponse<Role>>('/v1/admin/roles') });
}

/**
 * Staff and roles show data from each other (role names, staff counts), so refresh both.
 * Also refresh "me", in case you edited yourself or your own role.
 */
function useRefresh() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: STAFF_KEY });
    queryClient.invalidateQueries({ queryKey: ROLES_KEY });
    queryClient.invalidateQueries({ queryKey: ME_KEY });
  };
}

export function useSaveStaff() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: StaffInput }) =>
      id
        ? api<Staff>(`/v1/admin/staff/${id}`, { method: 'PATCH', body: input })
        : api<Staff>('/v1/admin/staff', { method: 'POST', body: input }),
    onSuccess: refresh,
  });
}

export function useSetStaffStatus() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: StaffStatus }) =>
      api<Staff>(`/v1/admin/staff/${id}`, { method: 'PATCH', body: { status } }),
    onSuccess: refresh,
  });
}

export function useDeleteStaff() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/v1/admin/staff/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });
}

export function useSaveRole() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: RoleInput }) =>
      id
        ? api<Role>(`/v1/admin/roles/${id}`, { method: 'PATCH', body: input })
        : api<Role>('/v1/admin/roles', { method: 'POST', body: input }),
    onSuccess: refresh,
  });
}

export function useDeleteRole() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/v1/admin/roles/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });
}
