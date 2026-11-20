import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Media } from '@/lib/types';

const KEY = ['push-campaigns'] as const;

export type PushCampaignStatus = 'scheduled' | 'sending' | 'sent' | 'cancelled';

export interface PushCampaign {
  id: number;
  title: string;
  body: string;
  url: string;
  imageId: number | null;
  image: Pick<Media, 'urls' | 'width' | 'height'> | null;
  status: PushCampaignStatus;
  sendAt: string;
  targeted: number;
  sent: number;
  failed: number;
  removed: number;
  taps: number;
  batches: number;
  batchesDone: number;
  createdByName: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface PushCampaignsResponse {
  items: PushCampaign[];
  audience: { devices: number; ready: boolean; testMode: boolean };
  rules: { quietFrom: number; quietUntil: number; minGapHours: number };
}

/** Mirrors the backend `campaignBody`. */
export interface PushCampaignInput {
  title: string;
  body: string;
  url: string;
  imageId: number | null;
  sendAt: string | null;
}

/** Offers and how many devices they would reach. Refreshes while one is on its way. */
export const usePushCampaigns = () =>
  useQuery({
    queryKey: KEY,
    queryFn: () => api<PushCampaignsResponse>('/v1/admin/push-campaigns'),
    refetchInterval: (q) => (q.state.data?.items.some((c) => c.status === 'sending' || c.status === 'scheduled') ? 5000 : false),
  });

export function useSendPushCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PushCampaignInput) => api<PushCampaign>('/v1/admin/push-campaigns', { method: 'POST', body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export const useTestPushCampaign = () =>
  useMutation({
    mutationFn: (input: Omit<PushCampaignInput, 'sendAt'> & { phone: string }) => api<{ sent: number; devices: number }>('/v1/admin/push-campaigns/test', { method: 'POST', body: input }),
  });

export function useCancelPushCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<PushCampaign>(`/v1/admin/push-campaigns/${id}/cancel`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
