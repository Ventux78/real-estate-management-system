/**
 * Property Module — Google Maps URL Utilities
 *
 * Provides reusable and extensible functions for Google Maps URL generation and validation.
 * Single Source of Truth for backend Google Maps URL generation.
 */

/**
 * Validates if the given string is a valid Google Maps URL.
 * Supported domains/formats include:
 * - google.com (e.g. google.com/maps..., www.google.com/maps...)
 * - maps.google.com
 * - maps.app.goo.gl
 * - goo.gl/maps
 */
export function isValidGoogleMapsUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  try {
    const parsed = new URL(trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`);
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();

    if (host === 'maps.app.goo.gl') {
      return true;
    }
    if (host === 'goo.gl' && pathname.startsWith('/maps')) {
      return true;
    }
    if (host === 'maps.google.com') {
      return true;
    }
    if ((host === 'google.com' || host === 'www.google.com' || host.endsWith('.google.com')) && pathname.includes('/maps')) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Generates a standard Google Maps Search URL from location hierarchy.
 * Sequence: [Address Detail (if present)] -> Neighborhood -> District -> Province -> Türkiye
 */
export function generateGoogleMapsUrl(
  address?: string | null,
  neighborhood?: string | null,
  district?: string | null,
  province?: string | null,
): string {
  const parts: string[] = [];

  if (address && address.trim()) {
    parts.push(address.trim());
  }
  if (neighborhood && neighborhood.trim()) {
    parts.push(neighborhood.trim());
  }
  if (district && district.trim()) {
    parts.push(district.trim());
  }
  if (province && province.trim()) {
    parts.push(province.trim());
  }

  // Always append country
  parts.push('Türkiye');

  const queryStr = parts.join(' ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryStr)}`;
}
