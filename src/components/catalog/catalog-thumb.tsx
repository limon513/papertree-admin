import { iconUrl, imageUrl } from '@/lib/store';
import type { Media } from '@/lib/types';
import { cn } from '@/lib/utils';

/** Small picture for a category or brand in lists: the image, else the icon, else the first letter. */
export function CatalogThumb({
  image,
  icon,
  name,
  muted,
  className,
}: {
  image: Media | null;
  icon: string | null;
  name: string;
  muted?: boolean;
  className?: string;
}) {
  const box = cn(
    'flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg',
    muted && 'opacity-60',
    className,
  );

  if (image) {
    return (
      <span className={cn(box, 'bg-white ring-1 ring-zinc-200')}>
        <img src={imageUrl(image, 160)} alt="" loading="lazy" className="size-full object-contain" />
      </span>
    );
  }
  if (icon) {
    return (
      <span className={cn(box, 'bg-zinc-50 ring-1 ring-zinc-200')}>
        <img src={iconUrl(icon)} alt="" loading="lazy" className="size-[62%]" />
      </span>
    );
  }
  return (
    <span className={cn(box, 'bg-brand-50 text-sm font-semibold text-brand-800')} aria-hidden>
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}
