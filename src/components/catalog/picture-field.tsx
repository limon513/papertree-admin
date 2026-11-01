import { useRef, useState, type DragEvent } from 'react';
import { ImagePlus, Search, Smile } from 'lucide-react';
import { useIcons, useUploadImage } from '@/hooks/use-catalog';
import { ApiError, errorMessage } from '@/lib/api';
import { iconUrl, imageUrl } from '@/lib/store';
import type { Media } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { LoadError, Skeleton, Spinner } from '@/components/ui/misc';

const MAX_MB = 10;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml';

/**
 * Image upload and icon choice for a category or brand.
 * The website shows the image if there is one, otherwise the icon.
 */
export function PictureField({
  imageLabel,
  image,
  onImageChange,
  icon,
  onIconChange,
  error,
}: {
  /** e.g. "Image" or "Logo". */
  imageLabel: string;
  image: Media | null;
  onImageChange: (image: Media | null) => void;
  icon: string | null;
  onIconChange: (icon: string | null) => void;
  /** Error from the form save (imageId or icon). */
  error?: string;
}) {
  return (
    <div>
      <div className="mb-1.5 text-sm font-medium text-zinc-800">Picture</div>
      <div className="grid grid-cols-2 gap-3">
        <ImageBox label={imageLabel} image={image} onChange={onImageChange} />
        <IconBox icon={icon} onChange={onIconChange} />
      </div>
      {error ? (
        <p className="mt-1.5 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-zinc-500">
          The website shows the {imageLabel.toLowerCase()} if there is one, otherwise the icon.
        </p>
      )}
    </div>
  );
}

const boxClasses = 'flex h-32 flex-col items-center justify-center gap-1.5 rounded-lg border text-center';

function ImageBox({ label, image, onChange }: { label: string; image: Media | null; onChange: (image: Media | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadImage();
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const uploadError =
    localError ??
    (upload.error instanceof ApiError ? (upload.error.fields.file ?? upload.error.message) : upload.error ? errorMessage(upload.error) : null);

  const start = (file: File | undefined) => {
    if (!file) return;
    upload.reset();
    if (file.size > MAX_MB * 1024 * 1024) {
      setLocalError(`The file is too big. The limit is ${MAX_MB} MB.`);
      return;
    }
    setLocalError(null);
    upload.mutate(file, { onSuccess: (media) => onChange(media) });
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    start(e.dataTransfer.files[0]);
  };

  const pick = () => inputRef.current?.click();

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          start(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn('relative', dragging && 'rounded-lg ring-3 ring-brand-200')}
      >
        {image ? (
          <div className={cn(boxClasses, 'overflow-hidden border-zinc-200 bg-[repeating-conic-gradient(#f4f4f5_0_25%,#fff_0_50%)] bg-[length:16px_16px] p-2')}>
            <img src={imageUrl(image, 400)} alt="" className="max-h-full max-w-full object-contain" />
          </div>
        ) : (
          <button
            type="button"
            onClick={pick}
            disabled={upload.isPending}
            className={cn(
              boxClasses,
              'w-full cursor-pointer border-dashed border-zinc-300 px-2 text-zinc-500 transition-colors hover:border-brand-400 hover:bg-brand-50/40 hover:text-brand-700',
            )}
          >
            <ImagePlus className="size-6" />
            <span className="text-sm font-medium">Upload {label.toLowerCase()}</span>
            <span className="text-xs text-zinc-400">or drop it here · up to {MAX_MB} MB</span>
          </button>
        )}
        {upload.isPending && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg bg-white/85 text-sm text-zinc-600">
            <Spinner />
            Uploading…
          </div>
        )}
      </div>
      {image && (
        <div className="mt-2 flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={pick} disabled={upload.isPending} className="flex-1">
            Replace
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)} disabled={upload.isPending}>
            Remove
          </Button>
        </div>
      )}
      {uploadError && (
        <p className="mt-1.5 text-sm text-red-600" role="alert">
          {uploadError}
        </p>
      )}
    </div>
  );
}

function IconBox({ icon, onChange }: { icon: string | null; onChange: (icon: string | null) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      {icon ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(boxClasses, 'w-full cursor-pointer border-zinc-200 bg-zinc-50 hover:border-brand-300')}
          aria-label="Change icon"
        >
          <img src={iconUrl(icon)} alt="" className="size-14" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            boxClasses,
            'w-full cursor-pointer border-dashed border-zinc-300 px-2 text-zinc-500 transition-colors hover:border-brand-400 hover:bg-brand-50/40 hover:text-brand-700',
          )}
        >
          <Smile className="size-6" />
          <span className="text-sm font-medium">Choose icon</span>
          <span className="text-xs text-zinc-400">from 100+ ready icons</span>
        </button>
      )}
      {icon && (
        <div className="mt-2 flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} className="flex-1">
            Change
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            Remove
          </Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        {open && (
          <IconPicker
            selected={icon}
            onSelect={(key) => {
              onChange(key);
              setOpen(false);
            }}
          />
        )}
      </Dialog>
    </div>
  );
}

function IconPicker({ selected, onSelect }: { selected: string | null; onSelect: (key: string) => void }) {
  const icons = useIcons();
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();

  const groups = (icons.data?.groups ?? [])
    .map((g) => ({
      ...g,
      icons: g.icons.filter((i) => !query || i.label.toLowerCase().includes(query) || i.key.includes(query)),
    }))
    .filter((g) => g.icons.length > 0);

  return (
    <DialogContent size="lg" title="Choose an icon" description="Colourful icons for stationery, school, art and gifts.">
      <DialogBody>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search icons, e.g. pen, book, gift"
            className="pl-9"
            aria-label="Search icons"
            autoFocus
          />
        </div>

        {icons.isError ? (
          <LoadError message={errorMessage(icons.error)} onRetry={() => icons.refetch()} />
        ) : icons.isPending ? (
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
            {Array.from({ length: 16 }, (_, i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">No icons match "{search.trim()}".</p>
        ) : (
          groups.map((group) => (
            <div key={group.label}>
              <h3 className="mb-2 text-xs font-semibold tracking-wider text-zinc-400 uppercase">{group.label}</h3>
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
                {group.icons.map((i) => (
                  <button
                    key={i.key}
                    type="button"
                    onClick={() => onSelect(i.key)}
                    title={i.label}
                    aria-label={i.label}
                    aria-pressed={selected === i.key}
                    className={cn(
                      'flex aspect-square cursor-pointer items-center justify-center rounded-lg border transition',
                      selected === i.key
                        ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-200'
                        : 'border-zinc-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-sm',
                    )}
                  >
                    <img src={iconUrl(i.key)} alt="" loading="lazy" className="size-8" />
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </DialogBody>
    </DialogContent>
  );
}
