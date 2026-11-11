import type { ProductInput } from '@/hooks/use-products';
import type { Media, Product, ProductStatus, StockLocation } from '@/lib/types';
import { fromTierForms, toTierForms, type TierForm } from '@/components/settings/bulk-tiers';

/**
 * The product form keeps numbers as text while the user types (so "" and "12." are allowed)
 * and turns them into numbers only when saving.
 */

export const MAX_OPTIONS = 3;
export const MAX_VARIANTS = 100;

let nextKey = 1;
const newKey = () => `k${nextKey++}`;

export type OptionValues = [string | null, string | null, string | null];

export interface VariantForm {
  /** Stable key for React lists (new variants have no id yet). */
  key: string;
  id?: number;
  values: OptionValues;
  sku: string;
  barcode: string;
  price: string;
  salePrice: string;
  /** "YYYY-MM-DDTHH:mm" for <input type="datetime-local">. */
  saleStartsAt: string;
  saleEndsAt: string;
  wholesalePrice: string;
  costPrice: string;
  weightGrams: string;
  imageId: number | null;
  trackStock: boolean;
  allowBackorder: boolean;
  lowStockThreshold: string;
  /** Stock typed in the form, per location id. */
  stock: Record<number, string>;
  /** Stock when the form was loaded, so only the change is saved. */
  baseStock: Record<number, number>;
}

export interface OptionForm {
  key: string;
  name: string;
  values: string[];
}

export interface ProductForm {
  name: string;
  slug: string;
  status: ProductStatus;
  shortDescription: string;
  description: string;
  brandId: number | null;
  categoryIds: number[];
  primaryCategoryId: number | null;
  tags: string[];
  images: Media[];
  options: OptionForm[];
  specs: { key: string; name: string; value: string }[];
  variants: VariantForm[];
  seoTitle: string;
  seoDescription: string;
  /** Bulk discount: the shop's steps, none, or its own. */
  bulkMode: 'shop' | 'off' | 'own';
  bulkTiers: TierForm[];
}

const text = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n));

/** ISO date -> local "YYYY-MM-DDTHH:mm". */
function toLocalInput(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function emptyVariant(): VariantForm {
  return {
    key: newKey(),
    values: [null, null, null],
    sku: '',
    barcode: '',
    price: '',
    salePrice: '',
    saleStartsAt: '',
    saleEndsAt: '',
    wholesalePrice: '',
    costPrice: '',
    weightGrams: '',
    imageId: null,
    trackStock: true,
    allowBackorder: false,
    lowStockThreshold: '',
    stock: {},
    baseStock: {},
  };
}

export function fromProduct(p?: Product): ProductForm {
  if (!p) {
    return {
      name: '',
      slug: '',
      status: 'draft',
      shortDescription: '',
      description: '',
      brandId: null,
      categoryIds: [],
      primaryCategoryId: null,
      tags: [],
      images: [],
      options: [],
      specs: [],
      variants: [emptyVariant()],
      seoTitle: '',
      seoDescription: '',
      bulkMode: 'shop',
      bulkTiers: [],
    };
  }
  return {
    name: p.name,
    slug: p.slug,
    status: p.status,
    shortDescription: p.shortDescription ?? '',
    description: p.description ?? '',
    brandId: p.brandId,
    categoryIds: p.categoryIds,
    primaryCategoryId: p.primaryCategoryId,
    tags: p.tags,
    images: p.images,
    options: p.options.map((o) => ({ key: newKey(), name: o.name, values: o.values })),
    specs: p.specs.map((s) => ({ key: newKey(), ...s })),
    variants: p.variants.map((v) => ({
      key: newKey(),
      id: v.id,
      values: [v.option1, v.option2, v.option3],
      sku: v.sku ?? '',
      barcode: v.barcode ?? '',
      price: text(v.price),
      salePrice: text(v.salePrice),
      saleStartsAt: toLocalInput(v.saleStartsAt),
      saleEndsAt: toLocalInput(v.saleEndsAt),
      wholesalePrice: text(v.wholesalePrice),
      costPrice: text(v.costPrice),
      weightGrams: text(v.weightGrams),
      imageId: v.imageId,
      trackStock: v.trackStock,
      allowBackorder: v.allowBackorder,
      lowStockThreshold: text(v.lowStockThreshold),
      stock: Object.fromEntries(v.stock.map((s) => [s.locationId, String(s.quantity)])),
      baseStock: Object.fromEntries(v.stock.map((s) => [s.locationId, s.quantity])),
    })),
    seoTitle: p.seoTitle ?? '',
    seoDescription: p.seoDescription ?? '',
    bulkMode: p.bulkDiscount?.mode ?? 'shop',
    bulkTiers: p.bulkDiscount?.mode === 'own' ? toTierForms(p.bulkDiscount.tiers) : [],
  };
}

/** "" -> null, "1,250.5" -> 1250.5, "abc" -> null (the API then asks for a valid number). */
function num(value: string): number | null {
  const cleaned = value.replace(/,/g, '').trim();
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function toInput(form: ProductForm, locations: StockLocation[]): ProductInput {
  const options = form.options
    .filter((o) => o.name.trim() && o.values.length)
    .map((o) => ({ name: o.name.trim(), values: o.values }));

  return {
    name: form.name,
    slug: form.slug,
    status: form.status,
    shortDescription: form.shortDescription.trim() || null,
    description: form.description || null,
    brandId: form.brandId,
    categoryIds: form.categoryIds,
    primaryCategoryId: form.primaryCategoryId,
    tags: form.tags,
    imageIds: form.images.map((m) => m.id),
    options,
    specs: form.specs
      .filter((s) => s.name.trim() || s.value.trim())
      .map((s) => ({ name: s.name.trim(), value: s.value.trim() })),
    variants: form.variants.map((v) => ({
      id: v.id,
      option1: options.length > 0 ? v.values[0] : null,
      option2: options.length > 1 ? v.values[1] : null,
      option3: options.length > 2 ? v.values[2] : null,
      sku: v.sku.trim() || null,
      barcode: v.barcode.trim() || null,
      price: num(v.price) as number,
      salePrice: num(v.salePrice),
      saleStartsAt: v.saleStartsAt ? new Date(v.saleStartsAt).toISOString() : null,
      saleEndsAt: v.saleEndsAt ? new Date(v.saleEndsAt).toISOString() : null,
      wholesalePrice: num(v.wholesalePrice),
      costPrice: num(v.costPrice),
      weightGrams: num(v.weightGrams),
      imageId: v.imageId,
      trackStock: v.trackStock,
      allowBackorder: v.allowBackorder,
      lowStockThreshold: num(v.lowStockThreshold),
      stock: locations.flatMap((l) => {
        const typed = v.stock[l.id];
        if (typed === undefined || typed.trim() === '') return [];
        return [{ locationId: l.id, quantity: num(typed) as number, baseQuantity: v.baseStock[l.id] }];
      }),
    })),
    seoTitle: form.seoTitle.trim() || null,
    seoDescription: form.seoDescription.trim() || null,
    bulkDiscount: form.bulkMode === 'off' ? { mode: 'off' } : form.bulkMode === 'own' ? { mode: 'own', tiers: fromTierForms(form.bulkTiers) } : null,
  };
}

const same = (a: string | null, b: string | null) => (a ?? '').toLowerCase() === (b ?? '').toLowerCase();

/** Every combination of the option values, e.g. [Red, A4], [Red, A5], [Blue, A4], ... */
export function combinations(options: { values: string[] }[]): string[][] {
  return options.reduce<string[][]>((acc, o) => acc.flatMap((combo) => o.values.map((v) => [...combo, v])), [[]]);
}

/**
 * Rebuilds the variant list after options change. Variants that still match keep their data
 * (and id, so stock history is kept). A variant made before an option was added keeps its data
 * on the first matching combination. New combinations copy prices from the first variant.
 */
export function syncVariants(options: OptionForm[], variants: VariantForm[]): VariantForm[] {
  const active = options.filter((o) => o.name.trim() && o.values.length);
  if (active.length === 0) {
    const first = variants[0] ?? emptyVariant();
    return [{ ...first, values: [null, null, null] }];
  }

  const combos = combinations(active);
  if (combos.length > MAX_VARIANTS) return variants;

  const template = variants[0] ?? emptyVariant();
  const used = new Set<string>();
  const exact = (v: VariantForm, values: OptionValues) => values.every((x, i) => same(v.values[i] ?? null, x));
  const partial = (v: VariantForm, values: OptionValues) => v.values.every((x, i) => x === null || same(x, values[i] ?? null));

  return combos.map((combo) => {
    const values: OptionValues = [combo[0] ?? null, combo[1] ?? null, combo[2] ?? null];
    const match =
      variants.find((v) => !used.has(v.key) && exact(v, values)) ??
      variants.find((v) => !used.has(v.key) && partial(v, values));
    if (match) {
      used.add(match.key);
      return { ...match, values };
    }
    return {
      ...emptyVariant(),
      values,
      price: template.price,
      wholesalePrice: template.wholesalePrice,
      costPrice: template.costPrice,
      weightGrams: template.weightGrams,
      trackStock: template.trackStock,
    };
  });
}

/** Removes option `index` and its value from every variant. */
export function removeOption(form: ProductForm, index: number): Pick<ProductForm, 'options' | 'variants'> {
  const options = form.options.filter((_, i) => i !== index);
  const variants = form.variants.map((v) => {
    const values = v.values.filter((_, i) => i !== index);
    return { ...v, values: [values[0] ?? null, values[1] ?? null, null] as OptionValues };
  });
  return { options, variants: syncVariants(options, variants) };
}

export const newOption = (): OptionForm => ({ key: newKey(), name: '', values: [] });
export const newSpec = () => ({ key: newKey(), name: '', value: '' });

/** "Red / A4" for a variant. */
export function variantLabel(v: VariantForm, options: OptionForm[]) {
  return options
    .map((_, i) => v.values[i])
    .filter(Boolean)
    .join(' / ');
}
