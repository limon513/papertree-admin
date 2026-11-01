import { useMemo, useState, type FormEvent } from 'react';
import { Eye, EyeOff, MoreHorizontal, Pencil, Plus, Search, Star, StarOff, Tags, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useBrands, useDeleteBrand, useSaveBrand, type BrandInput } from '@/hooks/use-catalog';
import { ApiError, errorMessage } from '@/lib/api';
import { STORE_PATHS } from '@/lib/store';
import type { Brand, Media } from '@/lib/types';
import { cn, slugify } from '@/lib/utils';
import { CatalogThumb } from '@/components/catalog/catalog-thumb';
import { PictureField } from '@/components/catalog/picture-field';
import { SeoFields } from '@/components/catalog/seo-fields';
import { SlugField, useSlug } from '@/components/catalog/slug-field';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogBody, DialogContent, DialogFooter } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { EmptyState, ErrorAlert, LoadError, Skeleton } from '@/components/ui/misc';
import { SwitchField } from '@/components/ui/switch';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'featured', label: 'Featured' },
  { key: 'hidden', label: 'Hidden' },
] as const;

type Filter = (typeof FILTERS)[number]['key'];
type FormState = { brand: Brand | null } | null;

export function BrandsPage() {
  const brands = useBrands();
  const save = useSaveBrand();
  const deleteBrand = useDeleteBrand();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [form, setForm] = useState<FormState>(null);
  const [toDelete, setToDelete] = useState<Brand | null>(null);

  const items = brands.data?.items ?? [];
  const query = search.trim().toLowerCase();
  const rows = useMemo(
    () =>
      items.filter(
        (b) =>
          (filter === 'all' || (filter === 'featured' ? b.isFeatured : !b.isActive)) &&
          (!query || b.name.toLowerCase().includes(query) || b.slug.includes(query)),
      ),
    [items, filter, query],
  );

  const quickUpdate = (brand: Brand, input: Partial<BrandInput>, message: string) =>
    save.mutate(
      { id: brand.id, input },
      { onSuccess: () => toast.success(message), onError: (err) => toast.error(errorMessage(err)) },
    );

  const confirmDelete = () =>
    toDelete &&
    deleteBrand.mutate(toDelete.id, {
      onSuccess: () => {
        toast.success(`"${toDelete.name}" deleted`);
        setToDelete(null);
      },
      onError: (err) => toast.error(errorMessage(err)),
    });

  return (
    <div>
      <PageHeader
        title="Brands"
        description="Brands you sell. Featured brands are shown first in the brand shop."
        actions={
          <Button onClick={() => setForm({ brand: null })}>
            <Plus /> New brand
          </Button>
        }
      />

      <Card className="overflow-hidden">
        {brands.isError ? (
          <LoadError message={errorMessage(brands.error)} onRetry={() => brands.refetch()} />
        ) : !brands.isPending && items.length === 0 ? (
          <EmptyState
            icon={<Tags />}
            title="No brands yet"
            description="Add the brands you sell, like Faber-Castell, Deli or Pentel."
            action={
              <Button onClick={() => setForm({ brand: null })}>
                <Plus /> New brand
              </Button>
            }
          />
        ) : (
          <>
            <div className="flex flex-col gap-3 border-b border-zinc-200 bg-zinc-50/70 px-4 py-3 sm:flex-row sm:items-center">
              <div className="relative sm:w-72">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search brands"
                  className="h-9 pl-9"
                  aria-label="Search brands"
                />
              </div>
              <div className="flex items-center justify-between gap-3 sm:ml-auto">
                <div className="flex rounded-lg bg-zinc-200/60 p-0.5" role="group" aria-label="Filter brands">
                  {FILTERS.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setFilter(f.key)}
                      aria-pressed={filter === f.key}
                      className={cn(
                        'cursor-pointer rounded-md px-3 py-1 text-sm font-medium transition-colors',
                        filter === f.key ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900',
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <span className="text-sm text-zinc-500">{brands.isPending ? '' : `${rows.length} shown`}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-200 text-left text-xs font-medium tracking-wide text-zinc-500 uppercase">
                  <tr>
                    <th className="px-5 py-3">Brand</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="w-12 px-5 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {brands.isPending
                    ? Array.from({ length: 4 }, (_, i) => (
                        <tr key={i}>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <Skeleton className="size-9 rounded-lg" />
                              <div className="space-y-2">
                                <Skeleton className="h-3.5 w-32" />
                                <Skeleton className="h-3 w-24" />
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <Skeleton className="h-5 w-16" />
                          </td>
                          <td />
                        </tr>
                      ))
                    : rows.map((brand) => (
                        <tr key={brand.id} className={brand.isActive ? 'hover:bg-zinc-50/60' : 'bg-zinc-50/50'}>
                          <td className="px-5 py-3">
                            <button
                              type="button"
                              onClick={() => setForm({ brand })}
                              className="flex cursor-pointer items-center gap-3 text-left"
                            >
                              <CatalogThumb
                                image={brand.image}
                                icon={brand.icon}
                                name={brand.name}
                                muted={!brand.isActive}
                                className="size-10"
                              />
                              <span className="min-w-0">
                                <span
                                  className={cn(
                                    'block font-medium',
                                    brand.isActive ? 'text-zinc-900' : 'text-zinc-500',
                                  )}
                                >
                                  {brand.name}
                                </span>
                                <span className="block text-xs text-zinc-400">/{brand.slug}</span>
                              </span>
                            </button>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {brand.isActive ? (
                                <Badge variant="green">Visible</Badge>
                              ) : (
                                <Badge>
                                  <EyeOff /> Hidden
                                </Badge>
                              )}
                              {brand.isFeatured && (
                                <Badge variant="amber">
                                  <Star /> Featured
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label={`Actions for ${brand.name}`}>
                                  <MoreHorizontal />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onSelect={() => setForm({ brand })}>
                                  <Pencil /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() =>
                                    quickUpdate(
                                      brand,
                                      { isFeatured: !brand.isFeatured },
                                      brand.isFeatured ? `${brand.name} is no longer featured` : `${brand.name} is featured`,
                                    )
                                  }
                                >
                                  {brand.isFeatured ? (
                                    <>
                                      <StarOff /> Remove from featured
                                    </>
                                  ) : (
                                    <>
                                      <Star /> Make featured
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() =>
                                    quickUpdate(
                                      brand,
                                      { isActive: !brand.isActive },
                                      brand.isActive ? `${brand.name} is hidden` : `${brand.name} is visible`,
                                    )
                                  }
                                >
                                  {brand.isActive ? (
                                    <>
                                      <EyeOff /> Hide from website
                                    </>
                                  ) : (
                                    <>
                                      <Eye /> Show on website
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem danger onSelect={() => setToDelete(brand)}>
                                  <Trash2 /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
              {!brands.isPending && rows.length === 0 && (
                <p className="px-4 py-12 text-center text-sm text-zinc-500">No brands match this search or filter.</p>
              )}
            </div>
          </>
        )}
      </Card>

      <Dialog open={form !== null} onOpenChange={(open) => !open && setForm(null)}>
        {form && <BrandFormDialog key={form.brand?.id ?? 'new'} brand={form.brand} onDone={() => setForm(null)} />}
      </Dialog>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        danger
        loading={deleteBrand.isPending}
        onConfirm={confirmDelete}
        title={`Delete "${toDelete?.name}"?`}
        description="This cannot be undone."
        confirmLabel="Delete brand"
      />
    </div>
  );
}

function BrandFormDialog({ brand, onDone }: { brand: Brand | null; onDone: () => void }) {
  const isEdit = brand !== null;
  const save = useSaveBrand();

  const [name, setName] = useState(brand?.name ?? '');
  const { slug, setSlug, changed } = useSlug(name, brand?.slug);
  const [description, setDescription] = useState(brand?.description ?? '');
  const [image, setImage] = useState<Media | null>(brand?.image ?? null);
  const [icon, setIcon] = useState<string | null>(brand?.icon ?? null);
  const [isActive, setIsActive] = useState(brand?.isActive ?? true);
  const [isFeatured, setIsFeatured] = useState(brand?.isFeatured ?? false);
  const [seoTitle, setSeoTitle] = useState(brand?.seoTitle ?? '');
  const [seoDescription, setSeoDescription] = useState(brand?.seoDescription ?? '');

  const fields = save.error instanceof ApiError ? save.error.fields : {};
  const generalError = save.isError && Object.keys(fields).length === 0 ? errorMessage(save.error) : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const input: BrandInput = {
      name,
      slug: slugify(slug),
      description: description.trim() || null,
      imageId: image?.id ?? null,
      icon,
      isActive,
      isFeatured,
      seoTitle: seoTitle.trim() || null,
      seoDescription: seoDescription.trim() || null,
    };
    save.mutate(
      { id: brand?.id, input },
      {
        onSuccess: (saved) => {
          toast.success(isEdit ? 'Brand saved' : `"${saved.name}" created`);
          onDone();
        },
      },
    );
  };

  return (
    <DialogContent size="lg" title={isEdit ? `Edit brand: ${brand.name}` : 'New brand'}>
      <form onSubmit={submit} noValidate>
        <DialogBody>
          {generalError && <ErrorAlert message={generalError} />}

          <Field label="Name" htmlFor="brand-name" error={fields.name} required>
            <Input
              id="brand-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              invalid={!!fields.name}
              placeholder="e.g. Faber-Castell"
              autoFocus
            />
          </Field>

          <SlugField
            id="brand-slug"
            prefix={STORE_PATHS.brand}
            value={slug}
            onChange={setSlug}
            changed={changed}
            error={fields.slug}
          />

          <Field
            label="Description"
            htmlFor="brand-description"
            error={fields.description}
            hint="Optional. Shown on the brand page."
          >
            <Textarea
              id="brand-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              invalid={!!fields.description}
            />
          </Field>

          <PictureField
            imageLabel="Logo"
            image={image}
            onImageChange={setImage}
            icon={icon}
            onIconChange={setIcon}
            error={fields.imageId ?? fields.icon}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <SwitchField
              id="brand-active"
              label="Show on website"
              description="When off, customers cannot see this brand."
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <SwitchField
              id="brand-featured"
              label="Featured"
              description="Shown first in the brand shop."
              checked={isFeatured}
              onCheckedChange={setIsFeatured}
            />
          </div>

          <SeoFields
            idPrefix="brand"
            path={STORE_PATHS.brand + (slugify(slug) || slugify(name))}
            title={seoTitle}
            description={seoDescription}
            onTitleChange={setSeoTitle}
            onDescriptionChange={setSeoDescription}
            fallbackTitle={name}
            fallbackDescription={description}
            errors={fields}
          />
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            {isEdit ? 'Save brand' : 'Create brand'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
