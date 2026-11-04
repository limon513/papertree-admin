import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react';
import type { BdLocations } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

export interface Places {
  districtIds: string[];
  areaIds: string[];
}

/**
 * Choose whole districts and/or single areas (upazilas, Dhaka City thanas).
 * Places that another active zone already covers are shown but cannot be chosen.
 */
export function PlacePicker({
  locations,
  value,
  onChange,
  taken,
}: {
  locations: BdLocations;
  value: Places;
  onChange: (value: Places) => void;
  /** "d:41" or "a:366" -> name of the zone that has it. */
  taken: Map<string, string>;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const query = search.trim().toLowerCase();

  const areasByDistrict = useMemo(() => {
    const map = new Map<string, BdLocations['areas']>();
    for (const a of locations.areas) map.set(a.districtId, [...(map.get(a.districtId) ?? []), a]);
    // Dhaka City thanas first, then upazilas.
    for (const list of map.values()) list.sort((x, y) => Number(y.city) - Number(x.city) || x.name.localeCompare(y.name));
    return map;
  }, [locations]);
  const districtName = (id: string) => locations.districts.find((d) => d.id === id)?.name ?? id;

  const districts = new Set(value.districtIds);
  const areas = new Set(value.areaIds);

  const toggleDistrict = (id: string, on: boolean) => {
    const inside = new Set((areasByDistrict.get(id) ?? []).map((a) => a.id));
    onChange({
      districtIds: on ? [...value.districtIds, id] : value.districtIds.filter((x) => x !== id),
      // A whole district already covers its areas.
      areaIds: on ? value.areaIds.filter((x) => !inside.has(x)) : value.areaIds,
    });
  };
  const toggleArea = (id: string, on: boolean) =>
    onChange({ ...value, areaIds: on ? [...value.areaIds, id] : value.areaIds.filter((x) => x !== id) });
  const setAreas = (ids: string[], on: boolean) => {
    const next = new Set(value.areaIds);
    for (const id of ids) (on ? next.add(id) : next.delete(id));
    onChange({ ...value, areaIds: [...next] });
  };

  const shownDistricts = query
    ? locations.districts.filter(
        (d) => d.name.toLowerCase().includes(query) || (areasByDistrict.get(d.id) ?? []).some((a) => a.name.toLowerCase().includes(query)),
      )
    : locations.districts;

  const chips = [
    ...value.districtIds.map((id) => ({ key: `d:${id}`, label: `${districtName(id)} (whole district)`, remove: () => toggleDistrict(id, false) })),
    ...value.areaIds.map((id) => {
      const a = locations.areas.find((x) => x.id === id);
      return { key: `a:${id}`, label: a ? a.name : id, remove: () => toggleArea(id, false) };
    }),
  ];

  return (
    <div className="space-y-2">
      {chips.length > 0 ? (
        <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
          {chips.map((c) => (
            <span key={c.key} className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-0.5 pr-1 pl-2.5 text-xs text-brand-800 ring-1 ring-brand-200">
              {c.label}
              <button type="button" onClick={c.remove} aria-label={`Remove ${c.label}`} className="rounded-full p-0.5 hover:bg-brand-100">
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">No places chosen yet.</p>
      )}

      <div className="rounded-lg border border-zinc-200">
        <div className="relative border-b border-zinc-200">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            aria-label="Find a district or area"
            placeholder="Find a district or area"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-b-none border-0 pl-9 shadow-none focus-visible:ring-0"
          />
        </div>
        <ul className="max-h-72 divide-y divide-zinc-100 overflow-y-auto">
          {shownDistricts.length === 0 && <li className="px-3 py-4 text-center text-sm text-zinc-500">Nothing found</li>}
          {shownDistricts.map((d) => {
            const list = areasByDistrict.get(d.id) ?? [];
            const matching = query ? list.filter((a) => a.name.toLowerCase().includes(query)) : list;
            const expanded = open === d.id || (query !== '' && !d.name.toLowerCase().includes(query));
            const owner = taken.get(`d:${d.id}`);
            const whole = districts.has(d.id);
            const chosenAreas = list.filter((a) => areas.has(a.id)).length;
            const free = matching.filter((a) => !taken.has(`a:${a.id}`)).map((a) => a.id);
            return (
              <li key={d.id}>
                <div className="flex items-center gap-2 px-3 py-2">
                  <Checkbox
                    checked={whole}
                    disabled={!!owner}
                    onCheckedChange={(v) => toggleDistrict(d.id, v === true)}
                    aria-label={`Whole ${d.name} district`}
                  />
                  <button
                    type="button"
                    onClick={() => setOpen(open === d.id ? null : d.id)}
                    className="flex min-w-0 flex-1 items-center gap-1 text-left text-sm"
                  >
                    {expanded ? <ChevronDown className="size-4 text-zinc-400" /> : <ChevronRight className="size-4 text-zinc-400" />}
                    <span className={cn('font-medium', owner ? 'text-zinc-400' : 'text-zinc-800')}>{d.name}</span>
                    {owner && <span className="truncate text-xs text-zinc-400">· in {owner}</span>}
                    {!whole && chosenAreas > 0 && (
                      <span className="text-xs text-brand-700">
                        · {chosenAreas} area{chosenAreas === 1 ? '' : 's'}
                      </span>
                    )}
                  </button>
                </div>
                {expanded && (
                  <div className="bg-zinc-50/60 px-3 pt-1 pb-2 pl-10">
                    {!whole && free.length > 1 && (
                      <div className="mb-1 flex gap-3 text-xs">
                        <button type="button" className="text-brand-700 hover:underline" onClick={() => setAreas(free, true)}>
                          Choose all {query ? 'shown' : ''}
                        </button>
                        <button type="button" className="text-zinc-500 hover:underline" onClick={() => setAreas(free, false)}>
                          Clear
                        </button>
                      </div>
                    )}
                    <div className="grid gap-x-4 sm:grid-cols-2">
                      {matching.map((a) => {
                        const areaOwner = taken.get(`a:${a.id}`);
                        return (
                          <label
                            key={a.id}
                            className={cn('flex items-center gap-2 py-1 text-sm', areaOwner || whole ? 'text-zinc-400' : 'cursor-pointer text-zinc-700')}
                          >
                            <Checkbox
                              checked={whole || areas.has(a.id)}
                              disabled={whole || !!areaOwner}
                              onCheckedChange={(v) => toggleArea(a.id, v === true)}
                            />
                            <span className="truncate">
                              {a.name}
                              {a.city && <span className="text-xs text-zinc-400"> · Dhaka City</span>}
                              {areaOwner && <span className="text-xs"> · in {areaOwner}</span>}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
