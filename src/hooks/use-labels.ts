import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** Website tags ("Overseas"): coloured badges on products, and a filter on product lists. */

export const LABEL_COLORS = ['green', 'blue', 'amber', 'red', 'purple', 'pink', 'gray', 'black'] as const;
export type LabelColor = (typeof LABEL_COLORS)[number];

export interface Label {
  id: number;
  name: string;
  slug: string;
  color: LabelColor;
  showOnCards: boolean;
  isActive: boolean;
  sortOrder: number;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface LabelInput {
  name: string;
  slug?: string;
  color: LabelColor;
  showOnCards: boolean;
  isActive: boolean;
  sortOrder: number;
}

const KEY = ['labels'] as const;

export const useLabels = () => useQuery({ queryKey: KEY, queryFn: () => api<{ items: Label[] }>('/v1/admin/labels') });

function useLabelMutation<T, R>(fn: (input: T) => Promise<R>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export const useSaveLabel = () =>
  useLabelMutation(({ id, input }: { id?: number; input: LabelInput }) =>
    api<Label>(id ? `/v1/admin/labels/${id}` : '/v1/admin/labels', { method: id ? 'PUT' : 'POST', body: input }),
  );
export const useDeleteLabel = () => useLabelMutation((id: number) => api<void>(`/v1/admin/labels/${id}`, { method: 'DELETE' }));

/** The badge colours, the same as on the website. */
export const LABEL_STYLE: Record<LabelColor, string> = {
  green: 'bg-emerald-100 text-emerald-800',
  blue: 'bg-sky-100 text-sky-800',
  amber: 'bg-amber-100 text-amber-900',
  red: 'bg-red-100 text-red-800',
  purple: 'bg-violet-100 text-violet-800',
  pink: 'bg-pink-100 text-pink-800',
  gray: 'bg-zinc-100 text-zinc-700',
  black: 'bg-zinc-900 text-white',
};
