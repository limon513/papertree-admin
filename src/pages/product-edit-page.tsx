import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useBlocker, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Copy, MoreHorizontal, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useBrands, useCategories } from '@/hooks/use-catalog';
import { useDeleteProduct, useDuplicateProduct, useProduct, useSaveProduct, useStockLocations } from '@/hooks/use-products';
import { ApiError, errorMessage } from '@/lib/api';
import { STORE_PATHS } from '@/lib/store';
import type { Product, ProductStatus } from '@/lib/types';
import { cn, formatDateTime, slugify } from '@/lib/utils';
import { SeoFields } from '@/components/catalog/seo-fields';
import { SlugField } from '@/components/catalog/slug-field';
import { CategoryPicker } from '@/components/products/category-picker';
import {
  fromProduct,
  newSpec,
  removeOption,
  syncVariants,
  toInput,
  type OptionForm,
  type ProductForm,
  type VariantForm,
} from '@/components/products/form-model';
import { ProductGallery } from '@/components/products/product-gallery';
import { STATUS_INFO } from '@/components/products/status';
import { RichTextEditor } from '@/components/products/rich-text-editor';
import {
  IdentityFields,
  OptionsEditor,
  PriceFields,
  StockFields,
  variantErrors,
  VariantsTable,
} from '@/components/products/variants-editor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Field } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { ErrorAlert, LoadError, Skeleton } from '@/components/ui/misc';
import { TagsInput } from '@/components/ui/tags-input';
import { LabelPicker } from '@/components/products/label-picker';
import { BulkTiersEditor, describeTiers, toTierForms } from '@/components/settings/bulk-tiers';
import { useSettings } from '@/hooks/use-settings';

export function ProductEditPage() {
  const { id } = useParams();
  // "/products/new" has id "new": no product to load.
  const productId = id && id !== 'new' ? Number(id) : undefined;
  const product = useProduct(productId);

  if (productId !== undefined && product.isError) {
    return (
      <Card>
        <LoadError message={errorMessage(product.error)} onRetry={() => product.refetch()} />
      </Card>
    );
  }
  if (productId !== undefined && !product.data) return <EditorSkeleton />;
  return <ProductEditor key={product.data?.id ?? 'new'} product={product.data} />;
}

function EditorSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Skeleton className="h-72" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function ProductEditor({ product }: { product: Product | undefined }) {
  const navigate = useNavigate();
  const isNew = product === undefined;
  const save = useSaveProduct();
  const duplicate = useDuplicateProduct();
  const remove = useDeleteProduct();
  const locations = useStockLocations();
  const categories = useCategories();
  const brands = useBrands();

  const [initial, setInitial] = useState<ProductForm>(() => fromProduct(product));
  const [form, setForm] = useState<ProductForm>(initial);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [confirmDelete, setConfirmDelete] = useState(false);
  /** Set just before we navigate away on purpose (after create or delete). */
  const leaving = useRef(false);

  const dirty = form !== initial && JSON.stringify(form) !== JSON.stringify(initial);

  // Ask before leaving with unsaved changes: inside the app...
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !leaving.current && dirty && currentLocation.pathname !== nextLocation.pathname,
  );
  // ...and when closing or reloading the tab.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = (patch: Partial<ProductForm>) => setForm((f) => ({ ...f, ...patch }));
  const setVariant = (index: number, patch: Partial<VariantForm>) =>
    setForm((f) => ({ ...f, variants: f.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)) }));
  const setOptions = (options: OptionForm[]) =>
    setForm((f) => ({ ...f, options, variants: syncVariants(options, f.variants) }));

  const fields = save.error instanceof ApiError ? save.error.fields : {};
  // The shop's steps, for the hint (staff without Settings access just do not see them).
  const shopBulk = useSettings().data?.checkout.bulk;
  const bulkHint =
    form.bulkMode === 'off'
      ? 'Always the normal price, however many are bought.'
      : form.bulkMode === 'own'
        ? "These steps instead of the shop's."
        : shopBulk
          ? !shopBulk.enabled
            ? 'Bulk discounts are switched off (Settings > Bulk discounts).'
            : shopBulk.tiers.length
              ? `Now: ${describeTiers(shopBulk.tiers)}`
              : 'The shop has no steps yet (Settings > Bulk discounts).'
          : undefined;
  const errorCount = Object.keys(fields).length;
  const generalError = save.isError && errorCount === 0 ? errorMessage(save.error) : null;

  const hasOptions = form.options.some((o) => o.name.trim() && o.values.length);
  const slug = slugTouched ? form.slug : slugify(form.name);
  const locationList = locations.data?.items ?? [];

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!locations.data) return;
    const input = toInput({ ...form, slug: slugTouched ? slugify(form.slug) : '' }, locationList);
    if (!slugTouched) delete input.slug;
    save.mutate(
      { id: product?.id, input },
      {
        onSuccess: (saved) => {
          const next = fromProduct(saved);
          setInitial(next);
          setForm(next);
          setSlugTouched(true);
          toast.success(isNew ? `"${saved.name}" created` : 'Product saved');
          if (isNew) {
            leaving.current = true;
            navigate(`/products/${saved.id}`, { replace: true });
          }
        },
        onError: () => {
          toast.error('The product was not saved. Check the highlighted fields.');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
      },
    );
  };

  const runDuplicate = () =>
    product &&
    duplicate.mutate(product.id, {
      onSuccess: (copy) => {
        toast.success('Copy created as a draft');
        navigate(`/products/${copy.id}`);
      },
      onError: (err) => toast.error(errorMessage(err)),
    });

  const runDelete = () =>
    product &&
    remove.mutate(product.id, {
      onSuccess: () => {
        toast.success(`"${product.name}" deleted`);
        leaving.current = true;
        navigate('/products', { replace: true });
      },
      onError: (err) => toast.error(errorMessage(err)),
    });

  const simple = form.variants[0];
  const simpleErrors = variantErrors(fields, 0);

  return (
    <form onSubmit={submit} noValidate className="pb-24">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Link to="/products" className="mb-1 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800">
            <ArrowLeft className="size-4" /> Products
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-zinc-900">
              {isNew ? 'New product' : product.name}
            </h1>
            {!isNew && <Badge variant={STATUS_INFO[product.status].badge}>{STATUS_INFO[product.status].label}</Badge>}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {!isNew && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="icon" aria-label="More actions">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={runDuplicate} disabled={duplicate.isPending}>
                  <Copy /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem danger onSelect={() => setConfirmDelete(true)}>
                  <Trash2 /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button type="submit" loading={save.isPending} disabled={!locations.data}>
            {isNew ? 'Create product' : 'Save'}
          </Button>
        </div>
      </div>

      {(generalError || errorCount > 0) && (
        <ErrorAlert
          className="mb-6"
          message={generalError ?? `Please fix ${errorCount === 1 ? 'the highlighted field' : `the ${errorCount} highlighted fields`}.`}
        />
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <Section title="Basics">
            <Field label="Name" htmlFor="product-name" error={fields.name} required>
              <Input
                id="product-name"
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                invalid={!!fields.name}
                placeholder="e.g. Faber-Castell Grip 2001 Pencil (Pack of 12)"
                autoFocus={isNew}
              />
            </Field>
            <Field
              label="Short description"
              htmlFor="product-short"
              error={fields.shortDescription}
              hint="One or two lines shown near the price."
            >
              <Textarea
                id="product-short"
                rows={2}
                value={form.shortDescription}
                onChange={(e) => set({ shortDescription: e.target.value })}
                invalid={!!fields.shortDescription}
              />
            </Field>
            <Field label="Description" htmlFor="product-description" error={fields.description}>
              <RichTextEditor
                id="product-description"
                value={form.description}
                onChange={(description) => set({ description })}
                placeholder="Features, what's in the box, how to use it…"
              />
            </Field>
          </Section>

          <Section title="Images" description="The first image is the main one, shown in lists and search.">
            <ProductGallery images={form.images} onChange={(change) => setForm((f) => ({ ...f, images: change(f.images) }))} />
            {fields.imageIds && <p className="text-sm text-red-600">{fields.imageIds}</p>}
          </Section>

          <Section
            title="Options & variants"
            description="Use options when the product comes in different colours, sizes or packs. Each combination gets its own price and stock."
          >
            <OptionsEditor
              options={form.options}
              onChange={setOptions}
              onRemove={(index) => setForm((f) => ({ ...f, ...removeOption(f, index) }))}
              errors={fields}
            />
            {fields.variants && <p className="text-sm text-red-600">{fields.variants}</p>}
            {hasOptions && (
              <VariantsTable
                variants={form.variants}
                options={form.options}
                images={form.images}
                locations={locationList}
                onChange={setVariant}
                errors={fields}
              />
            )}
          </Section>

          {!hasOptions && simple && (
            <>
              <Section title="Price">
                <PriceFields v={simple} onChange={(patch) => setVariant(0, patch)} errors={simpleErrors} />
              </Section>
              <Section title="Stock & shipping">
                <IdentityFields v={simple} onChange={(patch) => setVariant(0, patch)} errors={simpleErrors} />
                <StockFields v={simple} locations={locationList} onChange={(patch) => setVariant(0, patch)} errors={simpleErrors} />
              </Section>
            </>
          )}

          <Section
            title="Specifications"
            description="Details customers compare, like Paper size: A4 or GSM: 80. They will also be used as filters on the website."
          >
            <SpecsEditor specs={form.specs} onChange={(specs) => set({ specs })} errors={fields} />
          </Section>

          <Section title="Search engine listing">
            <SlugField
              id="product-slug"
              prefix={STORE_PATHS.product}
              value={slug}
              onChange={(value) => {
                setSlugTouched(true);
                set({ slug: value });
              }}
              changed={!isNew && slugify(form.slug) !== product.slug}
              error={fields.slug}
            />
            <SeoFields
              idPrefix="product"
              path={STORE_PATHS.product + (slugify(slug) || slugify(form.name))}
              title={form.seoTitle}
              description={form.seoDescription}
              onTitleChange={(seoTitle) => set({ seoTitle })}
              onDescriptionChange={(seoDescription) => set({ seoDescription })}
              fallbackTitle={form.name}
              fallbackDescription={form.shortDescription}
              errors={fields}
            />
          </Section>
        </div>

        <div className="space-y-6 lg:sticky lg:top-6">
          <Section title="Status">
            <Field label="Visibility" htmlFor="product-status" hint={STATUS_INFO[form.status].help}>
              <Select
                id="product-status"
                value={form.status}
                onChange={(e) => set({ status: e.target.value as ProductStatus })}
              >
                <option value="draft">Draft</option>
                <option value="active">Published</option>
                <option value="archived">Archived</option>
              </Select>
            </Field>
            {product?.publishedAt && (
              <p className="text-xs text-zinc-500">First published {formatDateTime(product.publishedAt)}</p>
            )}
          </Section>

          <Section title="Organise">
            <Field label="Brand" htmlFor="product-brand" error={fields.brandId}>
              <Select
                id="product-brand"
                value={form.brandId ?? ''}
                onChange={(e) => set({ brandId: e.target.value ? Number(e.target.value) : null })}
                invalid={!!fields.brandId}
              >
                <option value="">No brand</option>
                {brands.data?.items.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div>
              <div className="mb-1.5 text-sm font-medium text-zinc-800">Categories</div>
              <CategoryPicker
                categories={categories.data?.items ?? []}
                value={form.categoryIds}
                primaryId={form.primaryCategoryId}
                onChange={(categoryIds, primaryCategoryId) => set({ categoryIds, primaryCategoryId })}
                error={fields.categoryIds ?? fields.primaryCategoryId}
              />
            </div>
            <Field label="Tags" htmlFor="product-labels" error={fields.labelIds} hint="Badges on the website, like Overseas. Manage them under Products → Tags.">
              <LabelPicker id="product-labels" value={form.labelIds} onChange={(labelIds) => set({ labelIds })} />
            </Field>
            <Field label="Search keywords" htmlFor="product-tags" error={fields.tags} hint="Not shown: words that help search find it, e.g. school, office.">
              <TagsInput id="product-tags" value={form.tags} onChange={(tags) => set({ tags })} placeholder="Add a keyword" />
            </Field>
          </Section>

          <Section title="Bulk discount" description="Buy more, pay less per piece (retail). Shown in the cart, not on the product page.">
            <Field label="Discount" htmlFor="product-bulk" hint={bulkHint}>
              <Select
                id="product-bulk"
                value={form.bulkMode}
                onChange={(e) => {
                  const bulkMode = e.target.value as typeof form.bulkMode;
                  // Own steps start from the shop's, to change from there.
                  set({ bulkMode, bulkTiers: bulkMode === 'own' && form.bulkTiers.length === 0 ? toTierForms(shopBulk?.tiers ?? []) : form.bulkTiers });
                }}
              >
                <option value="shop">The shop's steps</option>
                <option value="off">No bulk discount</option>
                <option value="own">Its own steps</option>
              </Select>
            </Field>
            {form.bulkMode === 'own' && (
              <BulkTiersEditor
                idPrefix="product-bulk"
                value={form.bulkTiers}
                onChange={(bulkTiers) => set({ bulkTiers })}
                errorAt={(i, f) => fields[`bulkDiscount.tiers.${i}.${f}`] ?? (i === 0 ? fields['bulkDiscount.tiers'] ?? fields.bulkDiscount : undefined)}
              />
            )}
          </Section>
        </div>
      </div>

      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur lg:left-64">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <span className="text-sm text-zinc-600">You have unsaved changes</span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setForm(initial);
                  setSlugTouched(!isNew);
                  save.reset();
                }}
                disabled={save.isPending}
              >
                Discard
              </Button>
              <Button type="submit" loading={save.isPending} disabled={!locations.data}>
                {isNew ? 'Create product' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onOpenChange={(open) => !open && blocker.reset?.()}
        danger
        onConfirm={() => blocker.proceed?.()}
        title="Leave without saving?"
        description="Your changes to this product will be lost."
        confirmLabel="Leave"
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        danger
        loading={remove.isPending}
        onConfirm={runDelete}
        title={`Delete "${product?.name}"?`}
        description="The product, its variants and their stock history will be removed. This cannot be undone. To hide it instead, set it to Archived."
        confirmLabel="Delete product"
      />
    </form>
  );
}

function SpecsEditor({
  specs,
  onChange,
  errors,
}: {
  specs: ProductForm['specs'];
  onChange: (specs: ProductForm['specs']) => void;
  errors: Record<string, string>;
}) {
  const update = (index: number, patch: Partial<ProductForm['specs'][number]>) =>
    onChange(specs.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  return (
    <div className="space-y-2">
      <datalist id="spec-suggestions">
        {['Paper size', 'GSM', 'Pages', 'Pack', 'Colour', 'Material', 'Ink colour', 'Tip size', 'Dimensions', 'Country of origin'].map(
          (s) => (
            <option key={s} value={s} />
          ),
        )}
      </datalist>
      {specs.map((s, i) => {
        const nameError = errors[`specs.${i}.name`];
        const valueError = errors[`specs.${i}.value`];
        return (
          <div key={s.key}>
            <div className="flex gap-2">
              <Input
                list="spec-suggestions"
                value={s.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder="e.g. GSM"
                className="w-2/5"
                invalid={!!nameError}
                aria-label={`Specification ${i + 1} name`}
              />
              <Input
                value={s.value}
                onChange={(e) => update(i, { value: e.target.value })}
                placeholder="e.g. 80"
                invalid={!!valueError}
                aria-label={`Specification ${i + 1} value`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-zinc-400 hover:text-red-600"
                onClick={() => onChange(specs.filter((_, n) => n !== i))}
                aria-label={`Remove specification ${s.name || i + 1}`}
              >
                <X />
              </Button>
            </div>
            {(nameError || valueError) && <p className="mt-1 text-sm text-red-600">{nameError ?? valueError}</p>}
          </div>
        );
      })}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...specs, newSpec()])}
        className={cn(specs.length === 0 && 'mt-0')}
      >
        <Plus /> Add specification
      </Button>
    </div>
  );
}
