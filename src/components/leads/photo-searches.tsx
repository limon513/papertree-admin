import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, ExternalLink, ImageOff, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '@/lib/api';
import { STORE_URL } from '@/lib/store';
import type { PhotoSearchReport } from '@/lib/types';
import { cn, formatDateTime, timeAgo } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/misc';

const usePhotoReport = (days: number) =>
  useQuery({ queryKey: ['search-report', 'photos', days], queryFn: () => api<PhotoSearchReport>(`/v1/admin/search-report/photos?days=${days}`), placeholderData: keepPreviousData });

/**
 * Search by photo in the Reports page: how many photo searches, how many found the item, and the
 * photos that found nothing close (kept 30 days): things shoppers want that the shop does not have.
 */
export function PhotoSearches({ days }: { days: number }) {
  const q = usePhotoReport(days);
  const r = q.data;
  const queryClient = useQueryClient();
  const [removing, setRemoving] = useState<number | null>(null);
  const remove = useMutation({
    mutationFn: (id: number) => api<void>(`/v1/admin/search-report/photos/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Photo removed');
      setRemoving(null);
      void queryClient.invalidateQueries({ queryKey: ['search-report', 'photos'] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
  const share = r && r.totals.searches ? Math.round((r.totals.matched / r.totals.searches) * 100) : null;

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="size-4 text-zinc-500" /> Search by photo
        </CardTitle>
        <CardDescription>
          Shoppers who searched with a photo. Photos that found nothing close are kept {r?.keepDays ?? 30} days, so you can see what people want that the shop does not have yet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {!r ? (
          <Skeleton className="h-28" />
        ) : (
          <>
            <dl className={cn('grid grid-cols-2 gap-3 sm:grid-cols-4', q.isPlaceholderData && 'opacity-60')}>
              <Fact label="Photo searches" value={r.totals.searches.toLocaleString('en-US')} />
              <Fact label="Found the item" value={share === null ? '–' : `${share}%`} note={r.totals.searches ? `${r.totals.matched} of ${r.totals.searches}` : undefined} />
              <Fact label="Nothing close" value={(r.totals.searches - r.totals.matched).toLocaleString('en-US')} warn={r.totals.searches - r.totals.matched > 0} />
              <Fact
                label="Pictures ready"
                value={`${r.pictures.ready} of ${r.pictures.total}`}
                note={!r.enabled ? 'Switched off on this server' : r.pictures.ready < r.pictures.total ? 'New pictures are read every 10 minutes' : 'All product pictures'}
                warn={!r.enabled}
              />
            </dl>
            {r.noMatch.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-zinc-500">
                <ImageOff className="size-4" /> No photos without a close match in this period.
              </p>
            ) : (
              <div>
                <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Nothing close found</p>
                <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
                  {r.noMatch.map((p) => (
                    <li key={p.id} className="group overflow-hidden rounded-xl bg-white ring-1 ring-zinc-200">
                      <a href={p.photoUrl} target="_blank" rel="noopener noreferrer" className="block aspect-square bg-zinc-100" title="Open the photo">
                        <img src={p.photoUrl} alt="A shopper's photo" loading="lazy" className="size-full object-cover" />
                      </a>
                      <div className="space-y-0.5 p-2 text-xs">
                        <p className="text-zinc-700" title={formatDateTime(p.at)}>
                          {timeAgo(p.at)}
                          {p.device && <span className="text-zinc-400"> · {p.device}</span>}
                        </p>
                        {p.nearest && (
                          <a href={`${STORE_URL}/product/${p.nearest.slug}/`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-zinc-500 hover:text-brand-700" title="The closest product we showed">
                            <ExternalLink className="size-3 shrink-0" /> <span className="truncate">Nearest: {p.nearest.name}</span>
                          </a>
                        )}
                        <button type="button" onClick={() => setRemoving(p.id)} className="flex cursor-pointer items-center gap-1 text-zinc-400 hover:text-red-600">
                          <Trash2 className="size-3" /> Remove photo
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Remove this photo?"
        description="It is deleted now instead of after 30 days (for example when it shows a person). The search itself stays counted."
        confirmLabel="Remove photo"
        danger
        loading={remove.isPending}
        onConfirm={() => removing !== null && remove.mutate(removing)}
      />
    </Card>
  );
}

function Fact({ label, value, note, warn = false }: { label: string; value: string; note?: string; warn?: boolean }) {
  return (
    <div className="rounded-lg bg-zinc-50 px-3 py-2.5">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className={cn('mt-0.5 text-lg font-semibold tabular-nums', warn ? 'text-amber-700' : 'text-zinc-900')}>{value}</dd>
      {note && <dd className="text-xs text-zinc-500">{note}</dd>}
    </div>
  );
}
