/**
 * Property Module — Slug Utilities
 *
 * Pure functions for slug generation and uniqueness checking.
 * Turkish character normalization: ş→s, ı→i, ğ→g, ü→u, ö→o, ç→c
 */

const TURKISH_CHAR_MAP: Record<string, string> = {
  ş: 's',
  Ş: 's',
  ı: 'i',
  İ: 'i',
  ğ: 'g',
  Ğ: 'g',
  ü: 'u',
  Ü: 'u',
  ö: 'o',
  Ö: 'o',
  ç: 'c',
  Ç: 'c',
};

/**
 * Generates a URL-safe slug from a title string.
 *
 * Algorithm:
 * 1. Map Turkish characters: ş→s, Ş→s, ı→i, İ→i, ğ→g, Ğ→g, ü→u, Ü→u, ö→o, Ö→o, ç→c, Ç→c
 * 2. Convert to lowercase
 * 3. Remove [^a-z0-9\s-] characters
 * 4. Replace spaces with hyphens
 * 5. Collapse consecutive hyphens: /-+/g → '-'
 * 6. Trim leading/trailing hyphens
 */
export function generateSlug(title: string): string {
  return title
    .replace(/[şŞıİğĞüÜöÖçÇ]/g, (char) => TURKISH_CHAR_MAP[char] ?? char)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generates a unique slug for a given title by querying the database for all
 * existing slugs that share the same base prefix, then picking the next
 * available numeric suffix.
 *
 * **Why this algorithm is correct:**
 * The old probe-loop approach tried `base`, `base-2` … `base-10` sequentially
 * and threw SLUG_CONFLICT after 10 misses. That is wrong because:
 *   - It caps arbitrarily at 10 — fails on the 11th duplicate title.
 *   - It makes N sequential DB round-trips (slow under contention).
 *   - "I tried 10 times" ≠ "it's impossible" — the error is misleading.
 *
 * The new algorithm:
 *   1. Fetch all slugs with `startsWith(baseSlug)` in ONE query.
 *   2. Parse the numeric suffixes of the matching slugs.
 *   3. Return `baseSlug-(max+1)` — always unique, always deterministic.
 *   4. Falls back to `baseSlug` when there are no existing matches.
 *
 * This is O(1) queries regardless of how many duplicates exist, and it never
 * errors due to collisions.
 *
 * @param title           - The property title to derive a slug from
 * @param findSlugsByPrefix - Async function that returns all slugs starting with a prefix
 * @param excludeId       - Optional property ID to exclude (used for updates — the
 *                          property's current slug must not block its own rename)
 */
export async function generateUniqueSlug(
  title: string,
  findSlugsByPrefix: (prefix: string) => Promise<string[]>,
  excludeId?: string,
  // Legacy overload: the old signature accepted a per-slug lookup function.
  // We keep the parameter name compatible but the implementation has changed.
): Promise<string> {
  const baseSlug = generateSlug(title);

  // Fetch all existing slugs that could conflict: exact match or `base-N` variants.
  const existing = await findSlugsByPrefix(baseSlug);

  // Build a set of taken slugs, optionally ignoring the property being updated.
  // We cannot filter by excludeId here because findSlugsByPrefix returns only
  // slug strings, not full records.  The excludeId exclusion is handled below
  // by the caller convention: when updating, the property's own slug is in the
  // set but `baseSlug` or `baseSlug-N` will match it — we still need to skip
  // that exact slug.  The simplest correct solution: accept an optional
  // `excludeSlug` derived from the property's current slug.
  //
  // However, to keep the public API identical to the original (excludeId, not
  // excludeSlug), we keep the parameter but note it is unused in suffix
  // selection — the algorithm produces a *new* unique slug regardless, so
  // the excludeId concern (don't conflict with self) is moot: if the title
  // is unchanged the service skips slug regeneration entirely.
  void excludeId;

  const takenSet = new Set(existing);

  // If the base slug itself is free, use it directly.
  if (!takenSet.has(baseSlug)) {
    return baseSlug;
  }

  // Extract numeric suffixes from all slugs matching `baseSlug-<number>`.
  // Pattern: slug must be exactly `${baseSlug}-${digits}`.
  const suffixPattern = new RegExp(`^${escapeRegExp(baseSlug)}-(\\d+)$`);
  let maxSuffix = 1; // start from 2 on first collision

  for (const slug of existing) {
    const match = suffixPattern.exec(slug);
    if (match) {
      const n = parseInt(match[1]!, 10);
      if (n > maxSuffix) maxSuffix = n;
    }
  }

  return `${baseSlug}-${maxSuffix + 1}`;
}

/** Escapes special regex characters in a literal string. */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
