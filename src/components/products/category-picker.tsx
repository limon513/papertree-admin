import { useMemo, useState } from 'react';
import { Search, Star, X } from 'lucide-react';
import type { Category } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

/** Categories in tree order with their depth and full path ("Paper › Art Paper"). */
function useOrdered(categories: Category[]) {
  return useMemo(() => {
    const byParent = new Map<number | null, Category[]>();
    for (const c of categories) byParent.set(c.parentId, [...(byParent.get(c.parentId) ?? []), c]);
    for (const list of byParent.values()) list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

    const rows: { category: Category; depth: number; path: string }[] = [];
    const walk = (parentId: number | null, depth: number, prefix: string) => {
      for (const c of byParent.get(parentId) ?? []) {
        const path = prefix ? `${prefix} › ${c.name}` : c.name;
        rows.push({ category: c, depth, path });
        walk(c.id, depth + 1, path);
      }
    };
    walk(null, 0, '');
    return rows;
  }, [categories]);
}

/**
 * Pick one or more categories. The main one (star) is used for breadcrumbs and the product URL.
 */
export function CategoryPicker({
  categories,
  value,
  primaryId,
  onChange,
  error,
}: {
  categories: Category[];
  value: number[];
  primaryId: number | null;
  onChange: (ids: number[], primaryId: number | null) => void;
  error?: string;
}) {
  const rows = useOrdered(categories);
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const main = primaryId ?? value[0] ?? null;

  const toggle = (id: number, on: boolean) => {
    const ids = on ? [...value, id] : value.filter((x) => x !== id);
    const nextMain = ids.includes(main ?? -1) ? main : (ids[0] ?? null);
    onChange(ids, nextMain);
  };

  const pathOf = (id: number) => rows.find((r) => r.category.id === id)?.path ?? 'Deleted category';
  const shown = query ? rows.filter((r) => r.path.toLowerCase().includes(query)) : rows;

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="space-y-1.5">
          {value.map((id) => {
            const isMain = id === main;
            return (
              <li
                key={id}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                  isMain ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-zinc-50 ring-1 ring-zinc-200',
                )}
              >
                <button
                  type="button"
                  onClick={() => onChange(value, id)}
                  title={isMain ? 'Main category' : 'Make this the main category'}
                  aria-label={isMain ? 'Main category' : `Make ${pathOf(id)} the main category`}
                  className={cn(
                    'cursor-pointer rounded p-0.5',
                    isMain ? 'text-amber-500' : 'text-zinc-300 hover:text-amber-500',
                  )}
                >
                  <Star className={cn('size-4', isMain && 'fill-current')} />
                </button>
                <span className="min-w-0 flex-1 truncate text-zinc-800">{pathOf(id)}</span>
                {isMain && <span className="text-xs font-medium text-amber-700">Main</span>}
                <button
                  type="button"
                  onClick={() => toggle(id, false)}
                  aria-label={`Remove ${pathOf(id)}`}
                  className="cursor-pointer rounded p-0.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className={cn('overflow-hidden rounded-lg border', error ? 'border-red-400' : 'border-zinc-300')}>
        <div className="relative border-b border-zinc-200">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a category"
            className="h-9 w-full bg-transparent pr-3 pl-9 text-sm outline-none placeholder:text-zinc-400"
            aria-label="Find a category"
          />
        </div>
        <ul className="max-h-56 overflow-y-auto py-1">
          {shown.length === 0 ? (
            <li className="px-3 py-4 text-center text-sm text-zinc-500">
              {categories.length ? 'No categories match.' : 'No categories yet. Add them on the Categories page.'}
            </li>
          ) : (
            shown.map(({ category: c, depth, path }) => {
              const id = `cat-${c.id}`;
              return (
                <li key={c.id}>
                  <label
                    htmlFor={id}
                    className="flex cursor-pointer items-center gap-2.5 py-1.5 pr-3 text-sm hover:bg-zinc-50"
                    style={{ paddingLeft: 12 + (query ? 0 : depth * 18) }}
                  >
                    <Checkbox id={id} checked={value.includes(c.id)} onCheckedChange={(v) => toggle(c.id, v === true)} />
                    <span className={cn('truncate', c.isActive ? 'text-zinc-800' : 'text-zinc-400')}>
                      {query ? path : c.name}
                      {!c.isActive && ' (hidden)'}
                    </span>
                  </label>
                </li>
              );
            })
          )}
        </ul>
      </div>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
