import type { ProductStatus } from '@/lib/types';

export const STATUS_INFO: Record<ProductStatus, { label: string; help: string; badge: 'green' | 'gray' | 'amber' }> = {
  active: { label: 'Published', help: 'Customers can see and buy it.', badge: 'green' },
  draft: { label: 'Draft', help: 'Not on the website yet.', badge: 'gray' },
  archived: { label: 'Archived', help: 'Hidden from the website, kept for records.', badge: 'amber' },
};
