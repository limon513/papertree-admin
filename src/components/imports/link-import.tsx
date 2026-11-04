import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { AlertTriangle, Check, ExternalLink, Link2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useBrands, useCategories } from '@/hooks/use-catalog';
import { useCreateFromLink, useReadLink } from '@/hooks/use-imports';
import { ApiError, errorMessage } from '@/lib/api';
import type { LinkRead } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CategoryPicker } from '@/components/products/category-picker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/ui/field';
import { AddonInput, Input, Select } from '@/components/ui/input';
import { ErrorAlert, Spinner } from '@/components/ui/misc';

const SOURCE_LABEL: Record<LinkRead['product']['source'], string> = {
  woocommerce: 'WooCommerce shop',
  shopify: 'Shopify shop',
  daraz: 'Daraz',
  page: 'web page',
};

export function LinkImportCard() {
  const read = useReadLink();
  const [url, setUrl] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (url.trim()) read.mutate(url.trim());
  };

  const error =
    read.error instanceof ApiError ? (read.error.fields.url ?? read.error.message) : read.error ? errorMessage(read.error) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import from a link</CardTitle>
        <CardDescription>
          Paste a product page from Daraz, a WooCommerce or Shopify shop, or most other online shops. You check everything before a
          draft product is made.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Link2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              aria-label="Product link"
              type="text"
              inputMode="url"
              placeholder="https://www.daraz.com.bd/products/…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="pl-9"
              invalid={!!error}
            />
          </div>
          <Button type="submit" disabled={read.isPending || !url.trim()}>
            {read.isPending ? <Spinner className="size-4 text-white" /> : <Sparkles />}
            {read.isPending ? 'Reading the page…' : 'Read page'}
          </Button>
        </form>
        {error && <ErrorAlert message={error} />}
        {read.data && !read.isPending && (
          <LinkPreview
            // A new reading starts a fresh form.
            key={read.data.product.url + read.submittedAt}
            data={read.data}
            onCancel={() => {
              read.reset();
              setUrl('');
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}

const toText = (n: number | null) => (n === null ? '' : String(n));
const toNumber = (text: string) => (text.trim() === '' ? null : Number(text));

function LinkPreview({ data, onCancel }: { data: LinkRead; onCancel: () => void }) {
  const { product: p, match } = data;
  const navigate = useNavigate();
  const create = useCreateFromLink();
  const categories = useCategories();
  const brands = useBrands();

  // Prices in another currency are not copied: the user enters Taka prices.
  const inTaka = p.currency === null || p.currency === 'BDT';
  const foreign = (n: number | null) =>
    n === null ? null : new Intl.NumberFormat('en', { style: 'currency', currency: p.currency ?? 'USD' }).format(n);

  const [name, setName] = useState(p.name);
  const [images, setImages] = useState<string[]>(p.images);
  const [keepVariants, setKeepVariants] = useState(p.variants.length > 1);
  const [prices, setPrices] = useState(() =>
    (p.variants.length ? p.variants : [{ values: [], price: p.price, salePrice: p.salePrice, image: null }]).map((v) => ({
      price: inTaka ? toText(v.price) : '',
      sale: inTaka ? toText(v.salePrice) : '',
    })),
  );
  const [single, setSingle] = useState({ price: inTaka ? toText(p.price) : '', sale: inTaka ? toText(p.salePrice) : '' });
  const [brand, setBrand] = useState<string>(match.brandId ? String(match.brandId) : p.brand ? 'new' : '');
  const [categoryIds, setCategoryIds] = useState<number[]>(match.categoryIds);
  const [primaryId, setPrimaryId] = useState<number | null>(match.categoryIds[0] ?? null);
  const [copyDescription, setCopyDescription] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const variants = keepVariants ? p.variants : [];
  const rows = keepVariants ? prices : [single];

  const priceError = (text: string, sale = false) => {
    if (text.trim() === '') return sale ? null : 'Enter the price';
    const n = Number(text);
    return Number.isFinite(n) && n >= 0 ? null : 'Not a valid price';
  };

  const submit = () => {
    const found: Record<string, string> = {};
    if (name.trim().length < 2) found.name = 'Name must be at least 2 characters';
    rows.forEach((r, i) => {
      const e = priceError(r.price) ?? priceError(r.sale, true);
      if (e) found[`variants.${i}.price`] = e;
      else if (r.sale.trim() && Number(r.sale) >= Number(r.price)) found[`variants.${i}.price`] = 'The sale price must be lower';
    });
    setErrors(found);
    if (Object.keys(found).length) return;

    create.mutate(
      {
        url: p.url,
        name: name.trim(),
        shortDescription: copyDescription ? p.shortDescription : null,
        description: copyDescription ? p.description : null,
        images,
        brandId: brand && brand !== 'new' ? Number(brand) : null,
        newBrand: brand === 'new' ? p.brand : null,
        categoryIds,
        tags: p.tags,
        specs: p.specs,
        options: keepVariants ? p.options : [],
        variants: rows.map((r, i) => ({
          values: variants[i]?.values ?? [],
          price: Number(r.price),
          salePrice: toNumber(r.sale),
          image: variants[i]?.image ?? null,
        })),
      },
      {
        onSuccess: (result) => {
          toast.success('Draft product created', { description: result.note ?? 'Check it, then publish it.' });
          navigate(`/products/${result.productId}`);
        },
        onError: (err) => setErrors(err instanceof ApiError ? err.fields : {}),
      },
    );
  };

  const serverError =
    create.error && !(create.error instanceof ApiError && Object.keys(create.error.fields).length) ? errorMessage(create.error) : null;
  const firstError = Object.values(errors)[0];

  return (
    <div className="space-y-6 border-t border-zinc-200 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm text-zinc-600">
          <Check className="size-4 text-brand-600" />
          Read from {p.source === 'daraz' ? 'Daraz' : `${p.site} (${SOURCE_LABEL[p.source]})`}
        </p>
        <a
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline"
        >
          Open the page <ExternalLink className="size-3.5" />
        </a>
      </div>

      {p.notes.length > 0 && (
        <div className="flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <ul className="space-y-0.5">
            {p.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* Pictures */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-medium text-zinc-800">Pictures</h3>
            {p.images.length > 0 && (
              <span className="text-xs text-zinc-500">
                {images.length} of {p.images.length} chosen · the first is the main picture
              </span>
            )}
          </div>
          {p.images.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500">
              No pictures found. Add them on the product page.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {p.images.map((src) => {
                const on = images.includes(src);
                const position = images.indexOf(src);
                return (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setImages(on ? images.filter((x) => x !== src) : p.images.filter((x) => x === src || images.includes(x)))}
                    aria-pressed={on}
                    aria-label={on ? 'Leave out this picture' : 'Use this picture'}
                    className={cn(
                      'relative aspect-square overflow-hidden rounded-lg border-2 bg-zinc-50 transition',
                      on ? 'border-brand-600' : 'border-transparent opacity-50 hover:opacity-80',
                    )}
                  >
                    <img src={src} alt="" referrerPolicy="no-referrer" loading="lazy" className="size-full object-contain" />
                    <span
                      className={cn(
                        'absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full text-[11px] font-semibold',
                        on ? 'bg-brand-600 text-white' : 'bg-white/90 ring-1 ring-zinc-300',
                      )}
                    >
                      {on ? position + 1 : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-5">
          <Field label="Name" htmlFor="link-name" error={errors.name} required>
            <Input id="link-name" value={name} onChange={(e) => setName(e.target.value)} invalid={!!errors.name} maxLength={200} />
          </Field>

          {p.variants.length > 1 && (
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-zinc-700">
              <Checkbox checked={keepVariants} onCheckedChange={(v) => setKeepVariants(v === true)} className="mt-0.5" />
              <span>
                Keep the variants
                <span className="block text-xs text-zinc-500">
                  {p.options.map((o) => `${o.name}: ${o.values.join(', ')}`).join(' · ')}
                </span>
              </span>
            </label>
          )}

          {keepVariants ? (
            <div className="overflow-x-auto rounded-lg border border-zinc-200">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50/70 text-left text-xs font-medium tracking-wide text-zinc-500 uppercase">
                  <tr>
                    <th className="px-3 py-2">Variant</th>
                    <th className="px-3 py-2">Price</th>
                    <th className="px-3 py-2">Sale price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {p.variants.map((v, i) => (
                    <tr key={v.values.join('|')}>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {v.image && (
                            <img src={v.image} alt="" referrerPolicy="no-referrer" className="size-8 rounded object-cover" />
                          )}
                          <span className="font-medium text-zinc-800">{v.values.join(' / ')}</span>
                        </div>
                        {!inTaka && v.price !== null && <span className="text-xs text-zinc-500">On the site: {foreign(v.price)}</span>}
                        {errors[`variants.${i}.price`] && (
                          <span className="block text-xs text-red-600">{errors[`variants.${i}.price`]}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <AddonInput
                          prefix="৳"
                          aria-label={`Price of ${v.values.join(' / ')}`}
                          inputMode="decimal"
                          className="w-28"
                          value={prices[i]!.price}
                          invalid={!!errors[`variants.${i}.price`]}
                          onChange={(e) => setPrices(prices.map((r, n) => (n === i ? { ...r, price: e.target.value } : r)))}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <AddonInput
                          prefix="৳"
                          aria-label={`Sale price of ${v.values.join(' / ')}`}
                          inputMode="decimal"
                          className="w-28"
                          value={prices[i]!.sale}
                          onChange={(e) => setPrices(prices.map((r, n) => (n === i ? { ...r, sale: e.target.value } : r)))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Price"
                htmlFor="link-price"
                required
                error={errors['variants.0.price']}
                hint={!inTaka && p.price !== null ? `On the site: ${foreign(p.price)}` : undefined}
              >
                <AddonInput
                  id="link-price"
                  prefix="৳"
                  inputMode="decimal"
                  value={single.price}
                  invalid={!!errors['variants.0.price']}
                  onChange={(e) => setSingle({ ...single, price: e.target.value })}
                />
              </Field>
              <Field
                label="Sale price"
                htmlFor="link-sale"
                hint={!inTaka && p.salePrice !== null ? `On the site: ${foreign(p.salePrice)}` : 'Leave empty if not on sale'}
              >
                <AddonInput
                  id="link-sale"
                  prefix="৳"
                  inputMode="decimal"
                  value={single.sale}
                  onChange={(e) => setSingle({ ...single, sale: e.target.value })}
                />
              </Field>
            </div>
          )}

          <Field
            label="Brand"
            htmlFor="link-brand"
            hint={p.brand && brand !== 'new' && !match.brandId ? `On the site: ${p.brand}` : undefined}
          >
            <Select id="link-brand" value={brand} onChange={(e) => setBrand(e.target.value)}>
              <option value="">No brand</option>
              {p.brand && !match.brandId && <option value="new">Add new brand “{p.brand}”</option>}
              {brands.data?.items.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-zinc-800">Categories</span>
            {p.categories.length > 0 && <p className="text-xs text-zinc-500">On the site: {p.categories.join(' › ')}</p>}
            <CategoryPicker
              categories={categories.data?.items ?? []}
              value={categoryIds}
              primaryId={primaryId}
              onChange={(ids, main) => {
                setCategoryIds(ids);
                setPrimaryId(main);
              }}
            />
          </div>

          {(p.description || p.shortDescription) && (
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-700">
                <Checkbox checked={copyDescription} onCheckedChange={(v) => setCopyDescription(v === true)} />
                Copy the description
              </label>
              {copyDescription && (
                <div className="max-h-56 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50/50 px-4 py-3">
                  {p.shortDescription && <p className="mb-2 text-sm whitespace-pre-line text-zinc-600">{p.shortDescription}</p>}
                  {/* Cleaned by the server (no scripts, styles or pictures). */}
                  {p.description && <div className="rich-text text-sm" dangerouslySetInnerHTML={{ __html: p.description }} />}
                </div>
              )}
              <p className="text-xs text-zinc-500">Rewrite it in your own words before publishing, so the page is not a copy.</p>
            </div>
          )}

          {(p.specs.length > 0 || p.tags.length > 0) && (
            <p className="text-xs text-zinc-500">
              Also copied:{' '}
              {[
                p.specs.length && `${p.specs.length} specification${p.specs.length === 1 ? '' : 's'}`,
                p.tags.length && `${p.tags.length} tag${p.tags.length === 1 ? '' : 's'}`,
              ]
                .filter(Boolean)
                .join(', ')}
            </p>
          )}
        </div>
      </div>

      {(serverError || firstError) && <ErrorAlert message={serverError ?? `Please check: ${firstError}`} />}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-200 pt-4">
        <Button variant="ghost" onClick={onCancel} disabled={create.isPending}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={create.isPending}>
          {create.isPending && <Spinner className="size-4 text-white" />}
          {create.isPending ? 'Saving pictures…' : 'Create draft product'}
        </Button>
      </div>
    </div>
  );
}
