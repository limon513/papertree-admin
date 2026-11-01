import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  FolderTree,
  Package,
  Plus,
  Search,
  Tags,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useBrands, useCategories } from '@/hooks/use-catalog';
import { useBulkProducts, useProducts, type BulkAction, type ProductFilters } from '@/hooks/use-products';
import { errorMessage } from '@/lib/api';
import type { ProductListItem, ProductStatus } from '@/lib/types';
import { cn, formatMoney, timeAgo } from '@/lib/utils';
import { CatalogThumb } from '@/components/catalog/catalog-thumb';
import { PageHeader } from '@/components/layout/page-header';
import { BulkBrandDialog, BulkCategoryDialog } from '@/components/products/bulk-dialogs';
import { QuickStockDialog } from '@/components/products/quick-stock-dialog';
import { STATUS_INFO } from '@/components/products/status';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog } from '@/components/ui/dialog';
import { Input, Select } from '@/components/ui/input';
import { EmptyState, LoadError, Skeleton } from '@/components/ui/misc';

const TABS: { key: 'all' | ProductStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Published' },
  { key: 'draft', label: 'Drafts' },
  { key: 'archived', label: 'Archived' },
];

const SORTS = {
  updated: 'Recently changed',
  name: 'Name A–Z',
  price: 'Price: low to high',
  stock: 'Stock: low to high',
} as const;

const STATUS_DONE: Record<ProductStatus, string> = { active: 'published', draft: 'moved to drafts', archived: 'archived' };

type BulkDialog = 'category' | 'brand' | 'delete' | null;

export function ProductsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const brands = useBrands();
  const categories = useCategories();
  const bulk = useBulkProducts();

  // Filters live in the address bar, so Back and shared links keep them.
  const filters: ProductFilters = {
    search: params.get('search') ?? undefined,
    status: (params.get('status') as ProductStatus | null) ?? undefined,
    brandId: params.get('brand') ? Number(params.get('brand')) : undefined,
    categoryId: params.get('category') ? Number(params.get('category')) : undefined,
    stock: (params.get('stock') as ProductFilters['stock'] | null) ?? undefined,
    sort: (params.get('sort') as ProductFilters['sort']) ?? 'updated',
    page: Number(params.get('page') ?? 1),
  };
  const products = useProducts(filters);

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [dialog, setDialog] = useState<BulkDialog>(null);
  const [stockFor, setStockFor] = useState<number | null>(null);

  const setParam = (key: string, value: string | undefined) => {
    setSelected(new Set());
    // Start from the address bar as it is right now: two quick changes (a filter, then typing
    // a search) must not undo each other.
    const next = new URLSearchParams(window.location.search);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  // Search as you type, after a short pause.
  const [search, setSearch] = useState(filters.search ?? '');
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim() !== (filters.search ?? '')) setParam('search', search.trim() || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const data = products.data;
  const items = data?.items ?? [];
  const hasFilters = Boolean(filters.search || filters.brandId || filters.categoryId || filters.stock);
  const first = data ? (data.page - 1) * data.pageSize + 1 : 0;
  const last = data ? Math.min(data.page * data.pageSize, data.total) : 0;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const noProductsAtAll = data && data.counts.all === 0 && !hasFilters;

  const pageIds = items.map((p) => p.id);
  const selectedOnPage = pageIds.filter((id) => selected.has(id)).length;
  const allOnPage = pageIds.length > 0 && selectedOnPage === pageIds.length;
  const toggle = (id: number, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const togglePage = (on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of pageIds) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const runBulk = (action: BulkAction) => {
    const ids = [...selected];
    bulk.mutate(
      { ...action, ids },
      {
        onSuccess: ({ updated }) => {
          const n = `${updated} product${updated === 1 ? '' : 's'}`;
          const message =
            action.action === 'set-status'
              ? `${n} ${STATUS_DONE[action.status]}`
              : action.action === 'delete'
                ? `${n} deleted`
                : action.action === 'set-brand'
                  ? `Brand set on ${n}`
                  : updated === 0
                    ? 'Nothing to change'
                    : `${action.action === 'add-category' ? 'Added' : 'Removed'} ${n}`;
          toast.success(message);
          setSelected(new Set());
          setDialog(null);
        },
        onError: (err) => toast.error(errorMessage(err)),
      },
    );
  };

  return (
    <div className={cn(selected.size > 0 && 'pb-20')}>
      <PageHeader
        title="Products"
        description="Everything you sell. Click a product to edit it, or tick several to change them together."
        actions={
          <Button asChild>
            <Link to="/products/new">
              <Plus /> Add product
            </Link>
          </Button>
        }
      />

      <Card className="overflow-hidden">
        {products.isError ? (
          <LoadError message={errorMessage(products.error)} onRetry={() => products.refetch()} />
        ) : noProductsAtAll ? (
          <EmptyState
            icon={<Package />}
            title="No products yet"
            description="Add your first product, or import many at once later from Product Imports."
            action={
              <Button asChild>
                <Link to="/products/new">
                  <Plus /> Add product
                </Link>
              </Button>
            }
          />
        ) : (
          <>
            <div className="flex gap-1 overflow-x-auto border-b border-zinc-200 px-3 pt-2">
              {TABS.map((tab) => {
                const active = (filters.status ?? 'all') === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setParam('status', tab.key === 'all' ? undefined : tab.key)}
                    className={cn(
                      '-mb-px flex cursor-pointer items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                      active ? 'border-brand-600 text-brand-800' : 'border-transparent text-zinc-500 hover:text-zinc-800',
                    )}
                  >
                    {tab.label}
                    {data && (
                      <span
                        className={cn(
                          'rounded-full px-1.5 text-xs tabular-nums',
                          active ? 'bg-brand-100 text-brand-800' : 'bg-zinc-100 text-zinc-500',
                        )}
                      >
                        {data.counts[tab.key]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="grid gap-2 border-b border-zinc-200 bg-zinc-50/70 px-4 py-3 sm:grid-cols-2 lg:grid-cols-[1fr_160px_180px_150px_170px]">
              <div className="relative sm:col-span-2 lg:col-span-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or SKU"
                  className="h-9 pl-9"
                  aria-label="Search products"
                />
              </div>
              <Select
                value={filters.brandId ?? ''}
                onChange={(e) => setParam('brand', e.target.value || undefined)}
                className="h-9"
                aria-label="Filter by brand"
              >
                <option value="">All brands</option>
                {brands.data?.items.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
              <Select
                value={filters.categoryId ?? ''}
                onChange={(e) => setParam('category', e.target.value || undefined)}
                className="h-9"
                aria-label="Filter by category"
              >
                <option value="">All categories</option>
                {categories.data?.items
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </Select>
              <Select
                value={filters.stock ?? ''}
                onChange={(e) => setParam('stock', e.target.value || undefined)}
                className="h-9"
                aria-label="Filter by stock"
              >
                <option value="">All stock</option>
                <option value="low">Low stock</option>
                <option value="out">Out of stock</option>
              </Select>
              <Select
                value={filters.sort}
                onChange={(e) => setParam('sort', e.target.value === 'updated' ? undefined : e.target.value)}
                className="h-9"
                aria-label="Sort products"
              >
                {Object.entries(SORTS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>

            <div className={cn('overflow-x-auto transition-opacity', products.isPlaceholderData && 'opacity-60')}>
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-200 text-left text-xs font-medium tracking-wide text-zinc-500 uppercase">
                  <tr>
                    <th className="w-10 py-3 pl-5">
                      <Checkbox
                        checked={allOnPage ? true : selectedOnPage > 0 ? 'indeterminate' : false}
                        onCheckedChange={(v) => togglePage(v === true)}
                        disabled={!items.length}
                        aria-label="Select all products on this page"
                      />
                    </th>
                    <th className="px-3 py-3">Product</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Stock</th>
                    <th className="px-3 py-3 text-right">Price</th>
                    <th className="hidden px-3 py-3 md:table-cell">Brand</th>
                    <th className="hidden px-5 py-3 lg:table-cell">Changed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {!data
                    ? Array.from({ length: 6 }, (_, i) => (
                        <tr key={i}>
                          <td className="py-3 pl-5" />
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-3">
                              <Skeleton className="size-11 rounded-lg" />
                              <Skeleton className="h-3.5 w-48" />
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <Skeleton className="h-5 w-16" />
                          </td>
                          <td className="px-3 py-3">
                            <Skeleton className="h-3.5 w-16" />
                          </td>
                          <td className="px-3 py-3">
                            <Skeleton className="ml-auto h-3.5 w-14" />
                          </td>
                          <td className="hidden md:table-cell" />
                          <td className="hidden lg:table-cell" />
                        </tr>
                      ))
                    : items.map((p) => (
                        <ProductRow
                          key={p.id}
                          product={p}
                          selected={selected.has(p.id)}
                          onSelect={(on) => toggle(p.id, on)}
                          onOpen={() => navigate(`/products/${p.id}`)}
                          onStock={() => setStockFor(p.id)}
                        />
                      ))}
                </tbody>
              </table>
              {data && items.length === 0 && (
                <p className="px-4 py-14 text-center text-sm text-zinc-500">No products match these filters.</p>
              )}
            </div>

            {data && data.total > 0 && (
              <div className="flex items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3 text-sm text-zinc-600">
                <span className="tabular-nums">
                  {first}–{last} of {data.total}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    disabled={data.page <= 1}
                    onClick={() => setParam('page', String(data.page - 1))}
                    aria-label="Previous page"
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    disabled={data.page >= pages}
                    onClick={() => setParam('page', String(data.page + 1))}
                    aria-label="Next page"
                  >
                    <ChevronRight />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] backdrop-blur lg:left-64">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
            <span className="mr-1 text-sm font-medium text-zinc-900">{selected.size} selected</span>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())} aria-label="Clear selection">
              <X /> Clear
            </Button>
            <span className="hidden h-5 w-px bg-zinc-200 sm:block" />
            <Button variant="outline" size="sm" disabled={bulk.isPending} onClick={() => runBulk({ action: 'set-status', status: 'active' })}>
              <Eye /> Publish
            </Button>
            <Button variant="outline" size="sm" disabled={bulk.isPending} onClick={() => runBulk({ action: 'set-status', status: 'draft' })}>
              <EyeOff /> Move to drafts
            </Button>
            <Button variant="outline" size="sm" disabled={bulk.isPending} onClick={() => runBulk({ action: 'set-status', status: 'archived' })}>
              <Archive /> Archive
            </Button>
            <Button variant="outline" size="sm" disabled={bulk.isPending} onClick={() => setDialog('category')}>
              <FolderTree /> Category
            </Button>
            <Button variant="outline" size="sm" disabled={bulk.isPending} onClick={() => setDialog('brand')}>
              <Tags /> Brand
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:bg-red-50 hover:text-red-700 sm:ml-auto"
              disabled={bulk.isPending}
              onClick={() => setDialog('delete')}
            >
              <Trash2 /> Delete
            </Button>
          </div>
        </div>
      )}

      <Dialog open={dialog === 'category' || dialog === 'brand'} onOpenChange={(open) => !open && setDialog(null)}>
        {dialog === 'category' && (
          <BulkCategoryDialog count={selected.size} loading={bulk.isPending} onApply={runBulk} onCancel={() => setDialog(null)} />
        )}
        {dialog === 'brand' && (
          <BulkBrandDialog count={selected.size} loading={bulk.isPending} onApply={runBulk} onCancel={() => setDialog(null)} />
        )}
      </Dialog>

      <ConfirmDialog
        open={dialog === 'delete'}
        onOpenChange={(open) => !open && setDialog(null)}
        danger
        loading={bulk.isPending}
        onConfirm={() => runBulk({ action: 'delete' })}
        title={`Delete ${selected.size} product${selected.size === 1 ? '' : 's'}?`}
        description="Their variants and stock history will be removed too. This cannot be undone. To hide products instead, archive them."
        confirmLabel="Delete"
      />

      <Dialog open={stockFor !== null} onOpenChange={(open) => !open && setStockFor(null)}>
        {stockFor !== null && <QuickStockDialog productId={stockFor} onDone={() => setStockFor(null)} />}
      </Dialog>
    </div>
  );
}

function StockCell({ product: p, onClick }: { product: ProductListItem; onClick: () => void }) {
  const notes = [p.variantsOut > 0 && p.variantCount > 1 && `${p.variantsOut} out`, p.variantsLow > 0 && `${p.variantsLow} low`].filter(
    Boolean,
  );
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title="Change stock"
      className="-mx-2 cursor-pointer rounded-md px-2 py-1 text-left hover:bg-zinc-100"
    >
      {p.totalStock === null ? (
        <span className="text-zinc-400">Not tracked</span>
      ) : p.totalStock <= 0 ? (
        <span className="font-medium text-red-600">Out of stock</span>
      ) : (
        <span className={cn('tabular-nums', p.variantsLow > 0 ? 'text-amber-700' : 'text-zinc-700')}>
          {p.totalStock} in stock
        </span>
      )}
      {notes.length > 0 && p.totalStock !== null && p.totalStock > 0 && (
        <span className="block text-xs text-amber-700">{notes.join(' · ')}</span>
      )}
    </button>
  );
}

function ProductRow({
  product: p,
  selected,
  onSelect,
  onOpen,
  onStock,
}: {
  product: ProductListItem;
  selected: boolean;
  onSelect: (on: boolean) => void;
  onOpen: () => void;
  onStock: () => void;
}) {
  const status = STATUS_INFO[p.status];
  return (
    <tr className={cn('cursor-pointer', selected ? 'bg-brand-50/50' : 'hover:bg-zinc-50/70')} onClick={onOpen}>
      <td className="py-2.5 pl-5" onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={selected} onCheckedChange={(v) => onSelect(v === true)} aria-label={`Select ${p.name}`} />
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-3">
          <CatalogThumb image={p.image} icon={null} name={p.name} className="size-11" />
          <div className="min-w-0">
            <Link
              to={`/products/${p.id}`}
              onClick={(e) => e.stopPropagation()}
              className="line-clamp-2 font-medium text-zinc-900 hover:text-brand-700"
            >
              {p.name}
            </Link>
            {p.variantCount > 1 && <div className="text-xs text-zinc-500">{p.variantCount} variants</div>}
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <Badge variant={status.badge}>{status.label}</Badge>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        <StockCell product={p} onClick={onStock} />
      </td>
      <td className="px-3 py-2.5 text-right whitespace-nowrap tabular-nums">
        {p.onSale && (
          <Badge variant="red" className="mr-1.5">
            Sale
          </Badge>
        )}
        {p.priceMin === p.priceMax ? formatMoney(p.priceMin) : `${formatMoney(p.priceMin)} – ${formatMoney(p.priceMax)}`}
      </td>
      <td className="hidden px-3 py-2.5 text-zinc-600 md:table-cell">{p.brand?.name ?? '—'}</td>
      <td className="hidden px-5 py-2.5 whitespace-nowrap text-zinc-500 lg:table-cell">{timeAgo(p.updatedAt)}</td>
    </tr>
  );
}
