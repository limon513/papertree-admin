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
