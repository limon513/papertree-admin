import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ChevronLeft, ChevronRight, Package, Plus, Search } from 'lucide-react';
import { useBrands, useCategories } from '@/hooks/use-catalog';
import { useProducts, type ProductFilters } from '@/hooks/use-products';
import { errorMessage } from '@/lib/api';
import type { ProductListItem, ProductStatus } from '@/lib/types';
import { cn, formatMoney, timeAgo } from '@/lib/utils';
import { CatalogThumb } from '@/components/catalog/catalog-thumb';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { EmptyState, LoadError, Skeleton } from '@/components/ui/misc';
import { STATUS_INFO } from '@/components/products/status';

const TABS: { key: 'all' | ProductStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Published' },
  { key: 'draft', label: 'Drafts' },
  { key: 'archived', label: 'Archived' },
];

const SORTS = { updated: 'Recently changed', name: 'Name A–Z', price: 'Price: low to high' } as const;

export function ProductsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const brands = useBrands();
  const categories = useCategories();

  // Filters live in the address bar, so Back and shared links keep them.
  const filters: ProductFilters = {
    search: params.get('search') ?? undefined,
    status: (params.get('status') as ProductStatus | null) ?? undefined,
    brandId: params.get('brand') ? Number(params.get('brand')) : undefined,
    categoryId: params.get('category') ? Number(params.get('category')) : undefined,
    sort: (params.get('sort') as ProductFilters['sort']) ?? 'updated',
    page: Number(params.get('page') ?? 1),
  };
  const products = useProducts(filters);

  const setParam = (key: string, value: string | undefined) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        if (key !== 'page') next.delete('page');
        return next;
      },
      { replace: true },
    );

  // Search as you type, after a short pause.
  const [search, setSearch] = useState(filters.search ?? '');
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim() !== (filters.search ?? '')) setParam('search', search.trim() || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const data = products.data;
  const hasFilters = Boolean(filters.search || filters.brandId || filters.categoryId);
  const first = data ? (data.page - 1) * data.pageSize + 1 : 0;
  const last = data ? Math.min(data.page * data.pageSize, data.total) : 0;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const noProductsAtAll = data && data.counts.all === 0 && !hasFilters;

  return (
    <div>
      <PageHeader
        title="Products"
        description="Everything you sell. Click a product to edit it."
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
                      active
                        ? 'border-brand-600 text-brand-800'
                        : 'border-transparent text-zinc-500 hover:text-zinc-800',
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

            <div className="grid gap-2 border-b border-zinc-200 bg-zinc-50/70 px-4 py-3 sm:grid-cols-2 lg:grid-cols-[1fr_180px_200px_180px]">
              <div className="relative">
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
                    <th className="px-5 py-3">Product</th>
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
                          <td className="px-5 py-3">
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
                    : data.items.map((p) => (
                        <ProductRow key={p.id} product={p} onOpen={() => navigate(`/products/${p.id}`)} />
                      ))}
                </tbody>
              </table>
              {data && data.items.length === 0 && (
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
    </div>
  );
}

function ProductRow({ product: p, onOpen }: { product: ProductListItem; onOpen: () => void }) {
  const status = STATUS_INFO[p.status];
  return (
    <tr className="cursor-pointer hover:bg-zinc-50/70" onClick={onOpen}>
      <td className="px-5 py-2.5">
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
        {p.totalStock === null ? (
          <span className="text-zinc-400">Not tracked</span>
        ) : p.totalStock <= 0 ? (
          <span className="font-medium text-red-600">Out of stock</span>
        ) : (
          <span className="text-zinc-700 tabular-nums">{p.totalStock} in stock</span>
        )}
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
