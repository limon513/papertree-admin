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
