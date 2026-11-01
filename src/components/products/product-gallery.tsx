import { useRef, useState, type DragEvent } from 'react';
import { ImagePlus, Star, X } from 'lucide-react';
import { useUploadImage } from '@/hooks/use-catalog';
import { ApiError, errorMessage } from '@/lib/api';
import { imageUrl } from '@/lib/store';
import type { Media } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/misc';

const MAX_IMAGES = 20;
const MAX_MB = 10;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml';

type Update = (change: (images: Media[]) => Media[]) => void;

/** Product images. Upload several at once, drag to reorder; the first one is the main image. */
export function ProductGallery({ images, onChange }: { images: Media[]; onChange: Update }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadImage();
  const [pending, setPending] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [fileOver, setFileOver] = useState(false);

  const room = MAX_IMAGES - images.length;

  const uploadFiles = async (files: File[]) => {
    const problems: string[] = [];
    let list = files.filter((f) => {
      if (f.size > MAX_MB * 1024 * 1024) problems.push(`${f.name}: bigger than ${MAX_MB} MB`);
      return f.size <= MAX_MB * 1024 * 1024;
    });
    if (list.length > room) {
      problems.push(`Only ${MAX_IMAGES} images are allowed. ${list.length - room} were skipped.`);
      list = list.slice(0, Math.max(0, room));
    }
    setErrors(problems);
    setPending(list.length);
    // One at a time keeps the order the user picked and is gentle on slow connections.
    for (const file of list) {
      try {
        const media = await upload.mutateAsync(file);
        onChange((prev) => [...prev, media]);
      } catch (err) {
        const message = err instanceof ApiError ? (err.fields.file ?? err.message) : errorMessage(err);
        setErrors((prev) => [...prev, `${file.name}: ${message}`]);
      }
      setPending((n) => n - 1);
    }
  };

  const move = (from: number, to: number) =>
    onChange((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item!);
      return next;
    });

  const isFileDrag = (e: DragEvent) => e.dataTransfer.types.includes('Files');

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          void uploadFiles([...(e.target.files ?? [])]);
          e.target.value = '';
        }}
      />

      <div
        className={cn('grid grid-cols-3 gap-3 rounded-lg sm:grid-cols-4 lg:grid-cols-5', fileOver && 'ring-3 ring-brand-200')}
        onDragOver={(e) => {
          if (!isFileDrag(e)) return;
          e.preventDefault();
          setFileOver(true);
        }}
        onDragLeave={() => setFileOver(false)}
        onDrop={(e) => {
          if (!isFileDrag(e)) return;
          e.preventDefault();
          setFileOver(false);
          void uploadFiles([...e.dataTransfer.files]);
        }}
      >
        {images.map((image, i) => (
          <div
            key={image.id}
            draggable
            onDragStart={(e) => {
              setDragFrom(i);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(e) => {
              if (dragFrom === null) return;
              e.preventDefault();
              setDragOver(i);
            }}
            onDrop={(e) => {
              if (dragFrom === null) return;
              e.preventDefault();
              e.stopPropagation();
              if (dragFrom !== i) move(dragFrom, i);
              setDragFrom(null);
              setDragOver(null);
            }}
            onDragEnd={() => {
              setDragFrom(null);
              setDragOver(null);
            }}
            className={cn(
              'group relative aspect-square cursor-grab overflow-hidden rounded-lg border bg-white active:cursor-grabbing',
              i === 0 ? 'col-span-2 row-span-2 border-zinc-300' : 'border-zinc-200',
              dragOver === i && dragFrom !== i && 'ring-3 ring-brand-300',
              dragFrom === i && 'opacity-40',
            )}
          >
            <img
              src={imageUrl(image, i === 0 ? 400 : 160)}
              alt=""
              className="size-full object-contain p-1"
              draggable={false}
            />
            {i === 0 && (
              <span className="absolute top-2 left-2 rounded-md bg-zinc-900/75 px-1.5 py-0.5 text-[11px] font-medium text-white">
                Main image
              </span>
            )}
            <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              {i > 0 && (
                <button
                  type="button"
                  onClick={() => move(i, 0)}
                  title="Make main image"
                  aria-label="Make main image"
                  className="flex size-7 cursor-pointer items-center justify-center rounded-md bg-white/95 text-zinc-700 shadow-sm ring-1 ring-zinc-200 hover:text-amber-600"
                >
                  <Star className="size-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onChange((prev) => prev.filter((m) => m.id !== image.id))}
                title="Remove image"
                aria-label="Remove image"
                className="flex size-7 cursor-pointer items-center justify-center rounded-md bg-white/95 text-zinc-700 shadow-sm ring-1 ring-zinc-200 hover:text-red-600"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        ))}

        {Array.from({ length: pending }, (_, i) => (
          <div
            key={`pending-${i}`}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-xs text-zinc-500"
          >
            <Spinner />
            Uploading
          </div>
        ))}

        {room - pending > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              'flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-300 px-2 text-center text-zinc-500 transition-colors hover:border-brand-400 hover:bg-brand-50/40 hover:text-brand-700',
              images.length === 0 && pending === 0 && 'col-span-3 aspect-auto py-10 sm:col-span-4 lg:col-span-5',
            )}
          >
            <ImagePlus className="size-6" />
            <span className="text-sm font-medium">{images.length ? 'Add' : 'Add images'}</span>
            {images.length === 0 && (
              <span className="text-xs text-zinc-400">
                or drop them here · JPG, PNG, WebP or SVG, up to {MAX_MB} MB each
              </span>
            )}
          </button>
        )}
      </div>

      {images.length > 1 && <p className="mt-2 text-xs text-zinc-500">Drag images to change the order.</p>}
      {errors.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-sm text-red-600" role="alert">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
