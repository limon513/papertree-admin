import { API_URL } from './api';
import type { Media } from './types';

/**
 * Customer-facing store addresses, used for URL previews in forms.
 * The paths match the old WooCommerce site, so existing Google links keep working.
 */
export const STORE_DOMAIN = 'papertree.com.bd';

/** The website, for links that open it. Set VITE_STORE_URL for the demo site. */
export const STORE_URL = (import.meta.env.VITE_STORE_URL ?? `https://${STORE_DOMAIN}`).replace(/\/$/, '');

export const STORE_PATHS = {
  category: '/product-category/',
  brand: '/brand/',
  product: '/product/',
} as const;

/** Address of an icon file from the icon list. */
export const iconUrl = (key: string) => `${API_URL}/icons/${key}.svg`;

/** The smallest saved width that is at least `minWidth` wide (or the largest there is). */
export function imageUrl(image: Media, minWidth: number) {
  const widths = Object.keys(image.urls)
    .map(Number)
    .sort((a, b) => a - b);
  const width = widths.find((w) => w >= minWidth) ?? widths[widths.length - 1];
  return width === undefined ? image.url : (image.urls[String(width)] ?? image.url);
}
