/** Shapes returned by the API. Keep in sync with the backend `schemas.ts` files. */

export type ModuleKey =
  | 'products'
  | 'imports'
  | 'orders'
  | 'customers'
  | 'marketing'
  | 'content'
  | 'leads'
  | 'reports'
  | 'settings';

export interface AdminModule {
  key: ModuleKey;
  label: string;
  description: string;
}

export interface SignedInAdmin {
  id: number;
  name: string;
  email: string;
  role: {
    id: number;
    name: string;
    modules: ModuleKey[];
    canImpersonate: boolean;
    isSuperAdmin: boolean;
  };
}

export interface MeResponse {
  admin: SignedInAdmin;
  modules: AdminModule[];
}

export type StaffStatus = 'active' | 'disabled';

export interface Staff {
  id: number;
  name: string;
  email: string;
  status: StaffStatus;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  role: { id: number; name: string; isSuperAdmin: boolean };
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
  modules: ModuleKey[];
  canImpersonate: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  staffCount?: number;
}

export interface ListResponse<T> {
  items: T[];
}

export interface Category {
  id: number;
  parentId: number | null;
  name: string;
  slug: string;
  description: string | null;
  imageId: number | null;
  image: Media | null;
  /** Key from the icon list, shown when there is no image. */
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  imageId: number | null;
  image: Media | null;
  /** Key from the icon list, shown when there is no image. */
  icon: string | null;
  isActive: boolean;
  isFeatured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: string;
  updatedAt: string;
}

/** An uploaded image, saved in several widths. */
export interface Media {
  id: number;
  /** Largest saved width. */
  url: string;
  /** URL per saved width, e.g. { "160": "…", "400": "…" }. */
  urls: Record<string, string>;
  width: number;
  height: number;
  alt: string | null;
  originalName: string | null;
}

export interface IconGroup {
  label: string;
  icons: { key: string; label: string }[];
}

export type ProductStatus = 'draft' | 'active' | 'archived';

export interface ProductOption {
  name: string;
  values: string[];
}

export interface ProductSpec {
  name: string;
  value: string;
}

export interface StockLevel {
  locationId: number;
  quantity: number;
}

export interface ProductVariant {
  id: number;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  sku: string | null;
  barcode: string | null;
  price: number;
  salePrice: number | null;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  wholesalePrice: number | null;
  costPrice: number | null;
  weightGrams: number | null;
  imageId: number | null;
  image: Media | null;
  trackStock: boolean;
  allowBackorder: boolean;
  lowStockThreshold: number | null;
  position: number;
  stock: StockLevel[];
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  status: ProductStatus;
  shortDescription: string | null;
  description: string | null;
  brandId: number | null;
  categoryIds: number[];
  primaryCategoryId: number | null;
  tags: string[];
  images: Media[];
  options: ProductOption[];
  specs: ProductSpec[];
  variants: ProductVariant[];
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListItem {
  id: number;
  name: string;
  slug: string;
  status: ProductStatus;
  image: Media | null;
  brand: { id: number; name: string } | null;
  variantCount: number;
  priceMin: number;
  priceMax: number;
  onSale: boolean;
  /** null when no variant tracks stock. */
  totalStock: number | null;
  /** Variants with no stock left. */
  variantsOut: number;
  /** Variants at or below their low-stock level. */
  variantsLow: number;
  updatedAt: string;
}

export interface ProductList {
  items: ProductListItem[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<'all' | ProductStatus, number>;
}

export interface StockLocation {
  id: number;
  name: string;
  isDefault: boolean;
  isActive: boolean;
}

export type ImportStatus = 'preview' | 'queued' | 'running' | 'done' | 'failed' | 'cancelled';
export type ImportAction = 'create' | 'update' | 'skip' | 'error';

export interface ImportJob {
  id: number;
  status: ImportStatus;
  fileName: string;
  /** link: one product copied from a web page; fileName is the link. */
  format: 'papertree' | 'woocommerce' | 'daraz' | 'link';
  options: { existing: 'skip' | 'update'; status: 'file' | 'draft'; createMissing: boolean };
  total: number;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  error: string | null;
  createdBy: { id: number; name: string } | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  /** What the check decided, per product. */
  preview: Record<ImportAction, number>;
}

export interface ImportRow {
  id: number;
  position: number;
  lines: number[];
  name: string;
  action: ImportAction;
  status: 'pending' | 'done' | 'skipped' | 'failed';
  message: string | null;
  productId: number | null;
  variants: number;
  images: number;
  price: number | null;
}

export interface ImportDetail {
  job: ImportJob;
  rows: ImportRow[];
  rowsTotal: number;
  page: number;
  pageSize: number;
}

export interface LinkVariant {
  values: string[];
  price: number | null;
  salePrice: number | null;
  image: string | null;
}

/** A product read from another shop's page. */
export interface LinkProduct {
  url: string;
  site: string;
  source: 'woocommerce' | 'shopify' | 'daraz' | 'page';
  name: string;
  shortDescription: string | null;
  /** Cleaned HTML, without pictures. */
  description: string | null;
  price: number | null;
  salePrice: number | null;
  currency: string | null;
  brand: string | null;
  /** Category names on the site, broadest first. */
  categories: string[];
  tags: string[];
  specs: { name: string; value: string }[];
  images: string[];
  options: { name: string; values: string[] }[];
  variants: LinkVariant[];
  notes: string[];
}

export interface LinkRead {
  product: LinkProduct;
  /** Our brand and categories with the same names. */
  match: { brandId: number | null; categoryIds: number[] };
}
