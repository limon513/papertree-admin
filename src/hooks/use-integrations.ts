import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Integration, IntegrationKey, MessageLogEntry } from '@/lib/types';

const KEY = ['integrations'] as const;

export const useIntegrations = () => useQuery({ queryKey: KEY, queryFn: () => api<{ canKeepSecrets: boolean; items: Integration[] }>('/v1/admin/integrations') });

export function useSaveIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, settings, secrets }: { key: IntegrationKey; settings: Record<string, unknown>; secrets: Record<string, string | null> }) =>
      api<Integration>(`/v1/admin/integrations/${key}`, { method: 'PUT', body: { settings, secrets } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useTestIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, to }: { key: 'email' | 'sms'; to: string }) => api<MessageLogEntry>(`/v1/admin/integrations/${key}/test`, { method: 'POST', body: { to } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...KEY, 'messages'] }),
  });
}

/** Money on the Steadfast account (free: only reads, also checks the keys). */
export const useSteadfastBalance = () =>
  useMutation({ mutationFn: () => api<{ ok: true; balance: number } | { ok: false; message: string }>('/v1/admin/integrations/steadfast/balance', { method: 'POST', body: {} }) });

/** SMS left on the MiMSMS account (free: nothing is sent). */
export const useSmsBalance = () =>
  useMutation({ mutationFn: () => api<{ ok: true; balance: string } | { ok: false; message: string }>('/v1/admin/integrations/sms/balance', { method: 'POST', body: {} }) });

export const useMessages = (channel: 'all' | 'email' | 'sms', page: number) =>
  useQuery({
    queryKey: [...KEY, 'messages', channel, page],
    queryFn: () => api<{ items: MessageLogEntry[]; total: number; page: number; pageSize: number }>(`/v1/admin/integrations/messages?channel=${channel}&page=${page}`),
    placeholderData: keepPreviousData,
  });
