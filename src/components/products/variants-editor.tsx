import { Fragment, useState } from 'react';
import { ChevronDown, ImageIcon, Plus, Trash2 } from 'lucide-react';
import { imageUrl } from '@/lib/store';
import type { Media, StockLocation } from '@/lib/types';
import { cn, formatMoney } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogBody, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { AddonInput, Input } from '@/components/ui/input';
import { SwitchField } from '@/components/ui/switch';
import { TagsInput } from '@/components/ui/tags-input';
import {
  combinations,
  MAX_OPTIONS,
  MAX_VARIANTS,
  newOption,
  variantLabel,
  type OptionForm,
  type VariantForm,
} from './form-model';

type Errors = Record<string, string>;
type VariantPatch = Partial<VariantForm>;

const OPTION_SUGGESTIONS = ['Colour', 'Size', 'Paper size', 'Pack', 'GSM', 'Material', 'Type', 'Pages', 'Ruling'];

/** Errors for variant `index`, keyed by field ("price", "sku", ...). */
export function variantErrors(errors: Errors, index: number) {
  const prefix = `variants.${index}.`;
  const own: Errors = {};
  for (const [key, message] of Object.entries(errors)) {
    if (key.startsWith(prefix)) own[key.slice(prefix.length)] = message;
    else if (key === `variants.${index}`) own._ = message;
  }
  return own;
}

function profitHint(v: VariantForm) {
  const sell = Number(v.salePrice || v.price);
  const cost = Number(v.costPrice);
  if (!v.costPrice || !Number.isFinite(sell) || !Number.isFinite(cost) || sell <= 0) return undefined;
  const profit = sell - cost;
  return (
    <span className={profit < 0 ? 'text-red-600' : undefined}>
      Profit {formatMoney(Math.round(profit * 100) / 100)} · {Math.round((profit / sell) * 100)}% margin
    </span>
  );
}

/** Price fields of one variant (or of a simple product). */
export function PriceFields({ v, onChange, errors }: { v: VariantForm; onChange: (patch: VariantPatch) => void; errors: Errors }) {
  const [schedule, setSchedule] = useState(Boolean(v.saleStartsAt || v.saleEndsAt));
  const id = (name: string) => `v-${v.key}-${name}`;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Price" htmlFor={id('price')} error={errors.price} required>
          <AddonInput
            id={id('price')}
            prefix="৳"
            inputMode="decimal"
            value={v.price}
            onChange={(e) => onChange({ price: e.target.value })}
            invalid={!!errors.price}
            placeholder="0"
          />
        </Field>
        <Field
          label="Sale price"
          htmlFor={id('sale')}
          error={errors.salePrice}
          hint="Optional. Shown with the price crossed out."
        >
          <AddonInput
            id={id('sale')}
            prefix="৳"
            inputMode="decimal"
            value={v.salePrice}
            onChange={(e) => onChange({ salePrice: e.target.value })}
            invalid={!!errors.salePrice}
          />
        </Field>
      </div>

      {v.salePrice && (
        <div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
            <Checkbox
              checked={schedule}
              onCheckedChange={(on) => {
                setSchedule(on === true);
                if (on !== true) onChange({ saleStartsAt: '', saleEndsAt: '' });
              }}
            />
            Run the sale only between two dates
          </label>
          {schedule && (
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field label="Sale starts" htmlFor={id('sale-start')} error={errors.saleStartsAt}>
                <Input
                  id={id('sale-start')}
                  type="datetime-local"
                  value={v.saleStartsAt}
                  onChange={(e) => onChange({ saleStartsAt: e.target.value })}
                />
              </Field>
              <Field label="Sale ends" htmlFor={id('sale-end')} error={errors.saleEndsAt}>
                <Input
                  id={id('sale-end')}
                  type="datetime-local"
                  value={v.saleEndsAt}
                  onChange={(e) => onChange({ saleEndsAt: e.target.value })}
                  invalid={!!errors.saleEndsAt}
                />
              </Field>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Wholesale price"
          htmlFor={id('wholesale')}
          error={errors.wholesalePrice}
          hint="For approved business customers."
        >
          <AddonInput
            id={id('wholesale')}
            prefix="৳"
            inputMode="decimal"
            value={v.wholesalePrice}
            onChange={(e) => onChange({ wholesalePrice: e.target.value })}
            invalid={!!errors.wholesalePrice}
          />
        </Field>
        <Field
          label="Cost price"
          htmlFor={id('cost')}
          error={errors.costPrice}
          hint={profitHint(v) ?? 'What you pay. Customers never see this.'}
        >
          <AddonInput
            id={id('cost')}
            prefix="৳"
            inputMode="decimal"
            value={v.costPrice}
            onChange={(e) => onChange({ costPrice: e.target.value })}
            invalid={!!errors.costPrice}
          />
        </Field>
      </div>
    </div>
  );
}

/** SKU, barcode and weight. */
export function IdentityFields({ v, onChange, errors }: { v: VariantForm; onChange: (patch: VariantPatch) => void; errors: Errors }) {
  const id = (name: string) => `v-${v.key}-${name}`;
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field label="SKU" htmlFor={id('sku')} error={errors.sku} hint="Your own product code.">
        <Input id={id('sku')} value={v.sku} onChange={(e) => onChange({ sku: e.target.value })} invalid={!!errors.sku} />
      </Field>
      <Field label="Barcode" htmlFor={id('barcode')} error={errors.barcode}>
        <Input id={id('barcode')} value={v.barcode} onChange={(e) => onChange({ barcode: e.target.value })} />
      </Field>
      <Field label="Weight" htmlFor={id('weight')} error={errors.weightGrams} hint="For delivery charges.">
        <AddonInput
          id={id('weight')}
          suffix="g"
          inputMode="numeric"
          value={v.weightGrams}
          onChange={(e) => onChange({ weightGrams: e.target.value })}
          invalid={!!errors.weightGrams}
        />
      </Field>
    </div>
  );
}

/** Stock per location, low-stock warning and back-orders. */
export function StockFields({
  v,
  locations,
  onChange,
  errors,
}: {
  v: VariantForm;
  locations: StockLocation[];
  onChange: (patch: VariantPatch) => void;
  errors: Errors;
}) {
  const id = (name: string) => `v-${v.key}-${name}`;
  return (
    <div className="space-y-4">
      <SwitchField
        id={id('track')}
        label="Track stock"
        description="Count how many are left. Turn off for items you can always get."
        checked={v.trackStock}
        onCheckedChange={(trackStock) => onChange({ trackStock })}
      />
      {v.trackStock && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {locations.map((l) => (
              <Field
                key={l.id}
                label={locations.length === 1 ? 'Stock' : `Stock at ${l.name}`}
                htmlFor={id(`stock-${l.id}`)}
                error={errors.stock}
              >
                <Input
                  id={id(`stock-${l.id}`)}
                  inputMode="numeric"
                  value={v.stock[l.id] ?? ''}
                  onChange={(e) => onChange({ stock: { ...v.stock, [l.id]: e.target.value } })}
                  placeholder="0"
                />
              </Field>
            ))}
            <Field
              label="Low stock alert at"
              htmlFor={id('low')}
              error={errors.lowStockThreshold}
              hint="Warn when stock falls to this number."
            >
              <Input
                id={id('low')}
                inputMode="numeric"
                value={v.lowStockThreshold}
                onChange={(e) => onChange({ lowStockThreshold: e.target.value })}
              />
            </Field>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
            <Checkbox checked={v.allowBackorder} onCheckedChange={(on) => onChange({ allowBackorder: on === true })} />
            Allow orders when out of stock
          </label>
        </>
      )}
    </div>
  );
}

/** Option names and values, e.g. Colour: Red, Blue. Variants are made from every combination. */
export function OptionsEditor({
  options,
  onChange,
  onRemove,
  errors,
}: {
  options: OptionForm[];
  onChange: (options: OptionForm[]) => void;
  onRemove: (index: number) => void;
  errors: Errors;
}) {
  const update = (index: number, patch: Partial<OptionForm>) =>
    onChange(options.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  const count = combinations(options.filter((o) => o.name.trim() && o.values.length)).length;

  return (
    <div className="space-y-3">
      <datalist id="option-suggestions">
        {OPTION_SUGGESTIONS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      {options.map((o, i) => (
        <div key={o.key} className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3">
          <div className="grid gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-start">
            <Field label="Option" htmlFor={`option-${o.key}`} error={errors[`options.${i}.name`]}>
              <Input
                id={`option-${o.key}`}
                list="option-suggestions"
                value={o.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder="e.g. Colour"
                invalid={!!errors[`options.${i}.name`]}
              />
            </Field>
            <Field
              label="Values"
              htmlFor={`option-values-${o.key}`}
              error={errors[`options.${i}.values`]}
              hint="Press Enter after each value."
            >
              <TagsInput
                id={`option-values-${o.key}`}
                value={o.values}
                onChange={(values) => update(i, { values })}
                placeholder="e.g. Red, Blue, Black"
                invalid={!!errors[`options.${i}.values`]}
              />
            </Field>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-zinc-400 hover:text-red-600 sm:mt-6"
              onClick={() => onRemove(i)}
              aria-label={`Remove option ${o.name || i + 1}`}
            >
              <Trash2 />
            </Button>
          </div>
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {options.length < MAX_OPTIONS ? (
          <Button type="button" variant="outline" size="sm" onClick={() => onChange([...options, newOption()])}>
            <Plus /> {options.length ? 'Add another option' : 'Add options like colour or size'}
          </Button>
        ) : (
          <span />
        )}
        {count > MAX_VARIANTS && (
          <span className="text-sm text-red-600">
            {count} combinations — at most {MAX_VARIANTS}. Remove some values.
          </span>
        )}
      </div>
    </div>
  );
}

/** One row per variant, with the main fields inline and the rest when opened. */
export function VariantsTable({
  variants,
  options,
  images,
  locations,
  onChange,
  errors,
}: {
  variants: VariantForm[];
  options: OptionForm[];
  images: Media[];
  locations: StockLocation[];
  onChange: (index: number, patch: VariantPatch) => void;
  errors: Errors;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [bulk, setBulk] = useState({ price: '', wholesalePrice: '', stock: '' });
  const main = locations.find((l) => l.isDefault) ?? locations[0];

  const applyBulk = () => {
    variants.forEach((v, i) => {
      const patch: VariantPatch = {};
      if (bulk.price.trim()) patch.price = bulk.price;
      if (bulk.wholesalePrice.trim()) patch.wholesalePrice = bulk.wholesalePrice;
      if (bulk.stock.trim() && main) patch.stock = { ...v.stock, [main.id]: bulk.stock };
      onChange(i, patch);
    });
    setBulk({ price: '', wholesalePrice: '', stock: '' });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2 rounded-lg bg-zinc-50 p-3 ring-1 ring-zinc-200">
        <span className="w-full text-xs font-medium text-zinc-600">Set for all {variants.length} variants</span>
        <AddonInput
          prefix="৳"
          placeholder="Price"
          inputMode="decimal"
          value={bulk.price}
          onChange={(e) => setBulk({ ...bulk, price: e.target.value })}
          className="h-9 w-28"
          aria-label="Price for all variants"
        />
        <AddonInput
          prefix="৳"
          placeholder="Wholesale"
          inputMode="decimal"
          value={bulk.wholesalePrice}
          onChange={(e) => setBulk({ ...bulk, wholesalePrice: e.target.value })}
          className="h-9 w-32"
          aria-label="Wholesale price for all variants"
        />
        {main && (
          <Input
            placeholder="Stock"
            inputMode="numeric"
            value={bulk.stock}
            onChange={(e) => setBulk({ ...bulk, stock: e.target.value })}
            className="h-9 w-24"
            aria-label="Stock for all variants"
          />
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={applyBulk}
          disabled={!bulk.price.trim() && !bulk.wholesalePrice.trim() && !bulk.stock.trim()}
        >
          Apply
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50/70 text-left text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-3 py-2.5">Variant</th>
              <th className="px-2 py-2.5">Price</th>
              <th className="px-2 py-2.5">Wholesale</th>
              <th className="px-2 py-2.5">Stock</th>
              <th className="px-2 py-2.5">SKU</th>
              <th className="w-10 px-2 py-2.5">
                <span className="sr-only">More</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {variants.map((v, i) => {
              const errs = variantErrors(errors, i);
              const isOpen = open === v.key;
              const hasHiddenError = Object.keys(errs).some((k) => !['price', 'wholesalePrice', 'sku'].includes(k));
              return (
                <Fragment key={v.key}>
                  <tr className={cn(isOpen && 'bg-zinc-50/60', errs._ && 'bg-red-50/50')}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2.5">
                        <VariantImageButton
                          images={images}
                          value={v.imageId}
                          onChange={(imageId) => onChange(i, { imageId })}
                          label={variantLabel(v, options)}
                        />
                        <div className="min-w-0">
                          <div className="font-medium whitespace-nowrap text-zinc-900">{variantLabel(v, options)}</div>
                          {errs._ && <div className="text-xs text-red-600">{errs._}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <AddonInput
                        prefix="৳"
                        inputMode="decimal"
                        value={v.price}
                        onChange={(e) => onChange(i, { price: e.target.value })}
                        invalid={!!errs.price}
                        title={errs.price}
                        className="h-9 w-28"
                        aria-label={`Price for ${variantLabel(v, options)}`}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <AddonInput
                        prefix="৳"
                        inputMode="decimal"
                        value={v.wholesalePrice}
                        onChange={(e) => onChange(i, { wholesalePrice: e.target.value })}
                        invalid={!!errs.wholesalePrice}
                        title={errs.wholesalePrice}
                        className="h-9 w-28"
                        aria-label={`Wholesale price for ${variantLabel(v, options)}`}
                      />
                    </td>
                    <td className="px-2 py-2">
                      {!v.trackStock ? (
                        <span className="text-xs text-zinc-400">Not tracked</span>
                      ) : locations.length === 1 && main ? (
                        <Input
                          inputMode="numeric"
                          value={v.stock[main.id] ?? ''}
                          onChange={(e) => onChange(i, { stock: { ...v.stock, [main.id]: e.target.value } })}
                          placeholder="0"
                          className="h-9 w-20"
                          aria-label={`Stock for ${variantLabel(v, options)}`}
                        />
                      ) : (
                        <span className="tabular-nums">
                          {locations.reduce((sum, l) => sum + (Number(v.stock[l.id]) || 0), 0)}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        value={v.sku}
                        onChange={(e) => onChange(i, { sku: e.target.value })}
                        invalid={!!errs.sku}
                        title={errs.sku}
                        className="h-9 w-32"
                        aria-label={`SKU for ${variantLabel(v, options)}`}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn('size-8', hasHiddenError && 'text-red-600')}
                        onClick={() => setOpen(isOpen ? null : v.key)}
                        aria-expanded={isOpen}
                        aria-label={`More for ${variantLabel(v, options)}`}
                        title="Sale price, cost, weight, stock settings"
                      >
                        <ChevronDown className={cn('transition-transform', isOpen && 'rotate-180')} />
                      </Button>
                    </td>
                  </tr>
                  {(errs.price || errs.wholesalePrice || errs.sku) && !isOpen && (
                    <tr>
                      <td colSpan={6} className="px-3 pb-2 text-xs text-red-600">
                        {[errs.price, errs.wholesalePrice, errs.sku].filter(Boolean).join(' · ')}
                      </td>
                    </tr>
                  )}
                  {isOpen && (
                    <tr className="bg-zinc-50/60">
                      <td colSpan={6} className="space-y-5 px-3 pt-1 pb-4">
                        <PriceFields v={v} onChange={(patch) => onChange(i, patch)} errors={errs} />
                        <IdentityFields v={v} onChange={(patch) => onChange(i, patch)} errors={errs} />
                        <StockFields v={v} locations={locations} onChange={(patch) => onChange(i, patch)} errors={errs} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Picks the variant's picture from the product's gallery. */
function VariantImageButton({
  images,
  value,
  onChange,
  label,
}: {
  images: Media[];
  value: number | null;
  onChange: (id: number | null) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const current = images.find((m) => m.id === value);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex size-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-zinc-300 bg-white text-zinc-400 hover:border-brand-400 hover:text-brand-600"
        title="Choose a picture for this variant"
        aria-label={`Picture for ${label}`}
      >
        {current ? (
          <img src={imageUrl(current, 160)} alt="" className="size-full object-contain" />
        ) : (
          <ImageIcon className="size-4" />
        )}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        {open && (
          <DialogContent title={`Picture for ${label}`} description="Choose from the product images.">
            <DialogBody>
              {images.length === 0 ? (
                <p className="py-6 text-center text-sm text-zinc-500">Add images to the product first.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {images.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        onChange(m.id);
                        setOpen(false);
                      }}
                      className={cn(
                        'aspect-square cursor-pointer overflow-hidden rounded-lg border bg-white p-1',
                        m.id === value ? 'border-brand-500 ring-2 ring-brand-200' : 'border-zinc-200 hover:border-brand-300',
                      )}
                    >
                      <img src={imageUrl(m, 160)} alt="" className="size-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
              {value !== null && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                >
                  No picture
                </Button>
              )}
            </DialogBody>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
