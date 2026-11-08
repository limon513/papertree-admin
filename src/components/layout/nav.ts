import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Download,
  FolderTree,
  Inbox,
  LayoutDashboard,
  LayoutTemplate,
  Megaphone,
  Package,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Tags,
  UserCog,
  Users,
  WholeWord,
} from 'lucide-react';
import type { ModuleKey } from '@/lib/types';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Shown only if the role has this module. */
  module?: ModuleKey;
  /** Shown only to Super Admins. */
  superAdminOnly?: boolean;
  /** The page is built. Others show a "coming soon" page. */
  ready?: boolean;
  /** Dashboard card text. Defaults to the module description. */
  description?: string;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  { items: [{ label: 'Dashboard', to: '/', icon: LayoutDashboard, ready: true }] },
  {
    label: 'Catalog',
    items: [
      {
        label: 'Products',
        to: '/products',
        icon: Package,
        module: 'products',
        ready: true,
        description: 'Add and edit products, prices and stock',
      },
      {
        label: 'Categories',
        to: '/categories',
        icon: FolderTree,
        module: 'products',
        ready: true,
        description: 'Group products so customers can find them',
      },
      {
        label: 'Brands',
        to: '/brands',
        icon: Tags,
        module: 'products',
        ready: true,
        description: 'Brands for products and the brand shop',
      },
      {
        label: 'Product Imports',
        to: '/imports',
        icon: Download,
        module: 'imports',
        ready: true,
        description: 'Copy products from links, or import CSV, Excel and Daraz files',
      },
      {
        label: 'Search words',
        to: '/search-words',
        icon: WholeWord,
        module: 'products',
        ready: true,
        description: 'Words shoppers use for the same thing, like khata for notebook',
      },
    ],
  },
  {
    label: 'Sales',
    items: [
      {
        label: 'Orders',
        to: '/orders',
        icon: ShoppingCart,
        module: 'orders',
        ready: true,
        description: 'Take phone and Facebook orders, ship them and record payments',
      },
      {
        label: 'Customers',
        to: '/customers',
        icon: Users,
        module: 'customers',
        ready: true,
        description: 'Customers, business accounts and their terms',
      },
      {
        label: 'Requests & Leads',
        to: '/leads',
        icon: Inbox,
        module: 'leads',
        ready: true,
        description: 'Products shoppers asked for when a search found nothing',
      },
    ],
  },
  {
    label: 'Store',
    items: [
      { label: 'Marketing', to: '/marketing', icon: Megaphone, module: 'marketing' },
      {
        label: 'Website Content',
        to: '/content',
        icon: LayoutTemplate,
        module: 'content',
        ready: true,
        description: 'Home page banners: offers, campaigns, new arrivals',
      },
      {
        label: 'Reports',
        to: '/reports',
        icon: BarChart3,
        module: 'reports',
        ready: true,
        description: 'What shoppers search for, and what they could not find',
      },
    ],
  },
  {
    label: 'Admin',
    items: [
      {
        label: 'Settings',
        to: '/settings',
        icon: Settings,
        module: 'settings',
        ready: true,
        description: 'Store details, delivery charges, payments and stock locations',
      },
      {
        label: 'Staff',
        to: '/staff',
        icon: UserCog,
        superAdminOnly: true,
        ready: true,
        description: 'Add staff and control who can sign in',
      },
      {
        label: 'Roles',
        to: '/roles',
        icon: ShieldCheck,
        superAdminOnly: true,
        ready: true,
        description: 'Decide what each role can open',
      },
    ],
  },
];

/** Sections that exist in the menu but are built in later steps. */
export const COMING_SOON = NAV.flatMap((g) => g.items).filter((i) => i.module && !i.ready);
