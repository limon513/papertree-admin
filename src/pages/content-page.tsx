import { useState, type FormEvent } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, Eye, EyeOff, Image as ImageIcon, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useBanners, useDeleteBanner, useReorderBanners, useSaveBanner, type BannerInput } from '@/hooks/use-content';
import { ApiError, errorMessage } from '@/lib/api';
import { imageUrl, STORE_URL } from '@/lib/store';
import type { Banner, BannerPlacement, BannerState, Media } from '@/lib/types';
import { cn, formatDateTime } from '@/lib/utils';
import { ImageBox } from '@/components/catalog/picture-field';
import { PageHeader } from '@/components/layout/page-header';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogBody, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { EmptyState, ErrorAlert, LoadError, Skeleton } from '@/components/ui/misc';
import { SwitchField } from '@/components/ui/switch';

const PLACES: { key: BannerPlacement; title: string; help: string; size: string; most: number }[] = [
  {
    key: 'hero',
    title: 'Main slider',
    help: 'The big pictures at the top of the home page. They change every few seconds; shoppers can swipe.',
    size: '1200 × 600 (2:1)',
    most: 8,
  },
  {
    key: 'tile',
    title: 'Side offers',
    help: 'Two smaller pictures beside the slider on computers, under it on phones. Only the first two are shown.',
    size: '600 × 300 (2:1)',
    most: 2,
  },
];

const STATES: Record<BannerState, { label: string; badge: BadgeProps['variant'] }> = {
  live: { label: 'On the website', badge: 'green' },
  scheduled: { label: 'Scheduled', badge: 'blue' },
  ended: { label: 'Ended', badge: 'gray' },
  hidden: { label: 'Hidden', badge: 'gray' },
  no_picture: { label: 'Picture missing', badge: 'red' },
};

type FormState = { banner: Banner | null; placement: BannerPlacement } | null;

/** Website Content: the home page banners (main slider and side offers). */
export function ContentPage() {
  const banners = useBanners();
  const save = useSaveBanner();
  const reorder = useReorderBanners();
  const remove = useDeleteBanner();
  const [form, setForm] = useState<FormState>(null);
  const [toDelete, setToDelete] = useState<Banner | null>(null);
  const all = banners.data ?? [];

  const move = (list: Banner[], index: number, by: -1 | 1) => {
    const ids = list.map((b) => b.id);
    [ids[index], ids[index + by]] = [ids[index + by]!, ids[index]!];
    reorder.mutate(ids, { onError: (err) => toast.error(errorMessage(err)) });
  };
  const toggle = (b: Banner) =>
    save.mutate(
      { id: b.id, input: { ...inputOf(b), isActive: !b.isActive } },
      { onSuccess: () => toast.success(b.isActive ? 'Hidden from the website' : 'Shown on the website'), onError: (err) => toast.error(errorMessage(err)) },
    );

  return (
    <div>
      <PageHeader
        title="Website content"
        description="The banners at the top of the home page. Use them for offers, new arrivals and campaigns; pictures and moving GIFs both work."
        actions={
          <Button variant="outline" asChild>
            <a href={`${STORE_URL}/`} target="_blank" rel="noopener noreferrer">
              <ExternalLink /> See the home page
            </a>
          </Button>
        }
      />

      {banners.isError ? (
        <Card>
          <LoadError message={errorMessage(banners.error)} onRetry={() => banners.refetch()} />
        </Card>
      ) : (
        <div className="space-y-6">
          {PLACES.map((place) => {
            const list = all.filter((b) => b.placement === place.key).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
            const liveCount = list.filter((b) => b.state === 'live').length;
            return (
              <Card key={place.key} className="overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-zinc-200 bg-zinc-50/70 px-4 py-3 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <h2 className="font-semibold text-zinc-900">
                      {place.title} {banners.data && <span className="font-normal text-zinc-500">· {liveCount} on the website</span>}
                    </h2>
                    <p className="text-sm text-zinc-500">
                      {place.help} Picture size: <strong className="font-medium text-zinc-700">{place.size}</strong>.
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setForm({ banner: null, placement: place.key })}>
                    <Plus /> Add
                  </Button>
                </div>
                {banners.isPending ? (
                  <div className="space-y-2 p-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : list.length === 0 ? (
                  <EmptyState
                    icon={<ImageIcon />}
                    title={place.key === 'hero' ? 'No slider pictures yet' : 'No side offers yet'}
                    description={
                      place.key === 'hero'
                        ? 'Until you add one, the home page shows a simple welcome banner.'
                        : 'Without side offers, the slider uses the full width.'
                    }
                    action={
                      <Button onClick={() => setForm({ banner: null, placement: place.key })}>
                        <Plus /> Add the first one
                      </Button>
                    }
                  />
                ) : (
                  <ul className="divide-y divide-zinc-100">
                    {list.map((b, i) => {
                      const state = STATES[b.state];
                      const hiddenOnSite = place.key === 'tile' && b.state === 'live' && list.filter((x) => x.state === 'live').indexOf(b) >= place.most;
                      return (
                        <li key={b.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                          <div className="flex shrink-0 flex-col gap-1 max-sm:hidden">
                            <Button variant="ghost" size="icon" className="size-7" disabled={i === 0 || reorder.isPending} onClick={() => move(list, i, -1)} aria-label={`Move ${b.title} up`}>
                              <ArrowUp />
                            </Button>
                            <Button variant="ghost" size="icon" className="size-7" disabled={i === list.length - 1 || reorder.isPending} onClick={() => move(list, i, 1)} aria-label={`Move ${b.title} down`}>
                              <ArrowDown />
                            </Button>
                          </div>
                          <button
                            type="button"
                            onClick={() => setForm({ banner: b, placement: b.placement })}
                            className="aspect-[2/1] w-full shrink-0 cursor-pointer overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200 sm:w-48"
                            aria-label={`Edit ${b.title}`}
                          >
                            {b.image ? <img src={imageUrl(b.image, 400)} alt="" className="size-full object-cover" /> : <ImageIcon className="m-auto size-6 text-zinc-400" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-zinc-900">{b.title}</p>
                            <p className="truncate text-sm text-zinc-500">{b.linkUrl ? `Opens ${b.linkUrl}` : 'No link'}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                              <Badge variant={state.badge}>{state.label}</Badge>
                              {hiddenOnSite && <Badge variant="amber">Not shown: only 2 side offers fit</Badge>}
                              {b.mobileImage && <Badge>Own phone picture</Badge>}
                              {(b.startsAt || b.endsAt) && (
                                <span>
                                  {b.startsAt ? `From ${formatDateTime(b.startsAt)}` : 'Now'} {b.endsAt ? `until ${formatDateTime(b.endsAt)}` : 'with no end'}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button variant="ghost" size="icon" onClick={() => toggle(b)} disabled={save.isPending} aria-label={b.isActive ? `Hide ${b.title}` : `Show ${b.title}`}>
                              {b.isActive ? <EyeOff /> : <Eye />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setForm({ banner: b, placement: b.placement })} aria-label={`Edit ${b.title}`}>
                              <Pencil />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setToDelete(b)} aria-label={`Delete ${b.title}`}>
                              <Trash2 />
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(open) => !open && setForm(null)}>
        {form && <BannerForm key={form.banner?.id ?? `new-${form.placement}`} banner={form.banner} placement={form.placement} onDone={() => setForm(null)} />}
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete this banner?"
        description={toDelete ? `“${toDelete.title}” leaves the home page. Its pictures stay in your uploads. To show it again later, hide it instead.` : ''}
        confirmLabel="Delete"
        danger
        loading={remove.isPending}
        onConfirm={() =>
          toDelete &&
          remove.mutate(toDelete.id, {
            onSuccess: () => {
              toast.success('Banner deleted');
              setToDelete(null);
            },
            onError: (err) => toast.error(errorMessage(err)),
          })
        }
      />
    </div>
  );
}

const inputOf = (b: Banner): BannerInput => ({
  placement: b.placement,
  title: b.title,
  imageId: b.image?.id ?? null,
  mobileImageId: b.mobileImage?.id ?? null,
  linkUrl: b.linkUrl,
  startsAt: b.startsAt,
  endsAt: b.endsAt,
  isActive: b.isActive,
});

/** ISO time <-> the value of an <input type="datetime-local"> (this computer's time zone). */
const toLocal = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const fromLocal = (value: string) => (value ? new Date(value).toISOString() : null);

function BannerForm({ banner, placement: startPlacement, onDone }: { banner: Banner | null; placement: BannerPlacement; onDone: () => void }) {
  const save = useSaveBanner();
  const [placement, setPlacement] = useState(banner?.placement ?? startPlacement);
  const [title, setTitle] = useState(banner?.title ?? '');
  const [image, setImage] = useState<Media | null>(banner?.image ?? null);
  const [mobileImage, setMobileImage] = useState<Media | null>(banner?.mobileImage ?? null);
  const [linkUrl, setLinkUrl] = useState(banner?.linkUrl ?? '');
  const [startsAt, setStartsAt] = useState(toLocal(banner?.startsAt ?? null));
  const [endsAt, setEndsAt] = useState(toLocal(banner?.endsAt ?? null));
  const [isActive, setIsActive] = useState(banner?.isActive ?? true);
  const place = PLACES.find((p) => p.key === placement)!;

  const fields = save.error instanceof ApiError ? save.error.fields : {};
  const generalError = save.isError && Object.keys(fields).length === 0 ? errorMessage(save.error) : null;
  // A picture far from 2:1 is cropped on the website: say so.
  const shapeWarning = image && Math.abs(image.width / image.height - 2) > 0.25 ? `This picture is ${image.width} × ${image.height}; the website shows it at 2:1, so its edges are cut off.` : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(
      {
        id: banner?.id,
        input: { placement, title: title.trim(), imageId: image?.id ?? null, mobileImageId: mobileImage?.id ?? null, linkUrl: linkUrl.trim() || null, startsAt: fromLocal(startsAt), endsAt: fromLocal(endsAt), isActive },
      },
      {
        onSuccess: () => {
          toast.success(banner ? 'Banner saved' : 'Banner added');
          onDone();
        },
      },
    );
  };

  return (
    <DialogContent size="lg" title={banner ? 'Edit banner' : 'New banner'} description="Shown on the home page within a minute of saving.">
      <form onSubmit={submit} noValidate>
        <DialogBody>
          {generalError && <ErrorAlert message={generalError} />}
          <Field label="Where" htmlFor="banner-place">
            <div id="banner-place" className="flex rounded-lg bg-zinc-200/60 p-0.5" role="group">
              {PLACES.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPlacement(p.key)}
                  aria-pressed={placement === p.key}
                  className={cn(
                    'flex-1 cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    placement === p.key ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900',
                  )}
                >
                  {p.title}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Name" htmlFor="banner-title" error={fields.title} hint="For you, and read out to blind shoppers: say what the banner shows (“Eid offer: 20% off art supplies”)." required>
            <Input id="banner-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} invalid={!!fields.title} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Picture" htmlFor="banner-image" error={fields.imageId} hint={`${place.size}. JPG, PNG, WebP or GIF.`} required>
              <ImageBox label="Picture" image={image} onChange={setImage} />
              {shapeWarning && <p className="mt-1.5 text-xs text-amber-700">{shapeWarning}</p>}
            </Field>
            <Field label="Phone picture (optional)" htmlFor="banner-mobile" error={fields.mobileImageId} hint="Same 2:1 shape with bigger text, for small screens. Without it, phones show the main picture.">
              <ImageBox label="Phone picture" image={mobileImage} onChange={setMobileImage} />
            </Field>
          </div>
          <Field label="Link (optional)" htmlFor="banner-link" error={fields.linkUrl} hint="Where a tap goes: a page of the shop like /deals/ or /product-category/art-craft/.">
            <Input id="banner-link" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="/deals/" maxLength={500} invalid={!!fields.linkUrl} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Show from (optional)" htmlFor="banner-start" error={fields.startsAt} hint="Empty: straight away.">
              <Input id="banner-start" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} invalid={!!fields.startsAt} />
            </Field>
            <Field label="Show until (optional)" htmlFor="banner-end" error={fields.endsAt} hint="Empty: until you hide it.">
              <Input id="banner-end" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} invalid={!!fields.endsAt} />
            </Field>
          </div>
          <SwitchField id="banner-active" label="Show on the website" description="Switch off to keep it here without showing it." checked={isActive} onCheckedChange={setIsActive} />
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending} disabled={!image || !title.trim()}>
            {banner ? 'Save' : 'Add banner'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
