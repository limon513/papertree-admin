import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { ME_KEY } from '@/lib/query-client';
import type { MeResponse, ModuleKey, SignedInAdmin } from '@/lib/types';

/** The signed-in admin, or null when signed out. */
export function useMe() {
  return useQuery({
    queryKey: ME_KEY,
    queryFn: async () => {
      try {
        return await api<MeResponse>('/v1/admin/auth/me');
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 5 * 60_000,
  });
}

/** Use inside signed-in pages only. */
export function useSession(): MeResponse {
  const { data } = useMe();
  if (!data) throw new Error('useSession used outside a signed-in page');
  return data;
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      api<MeResponse>('/v1/admin/auth/login', { method: 'POST', body: input }),
    onSuccess: (data) => queryClient.setQueryData(ME_KEY, data),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>('/v1/admin/auth/logout', { method: 'POST' }),
    onSettled: () => {
      queryClient.clear();
      queryClient.setQueryData(ME_KEY, null);
    },
  });
}

export function canOpen(admin: SignedInAdmin, module: ModuleKey) {
  return admin.role.isSuperAdmin || admin.role.modules.includes(module);
}
