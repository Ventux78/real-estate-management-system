import { generateSlug } from '@/modules/property/utils/slugUtils';

describe('generateSlug', () => {
  describe('Turkish character normalization', () => {
    it('converts ş to s', () => {
      expect(generateSlug('şehir')).toBe('sehir');
    });

    it('converts Ş to s', () => {
      expect(generateSlug('Şehir')).toBe('sehir');
    });

    it('converts ı to i', () => {
      expect(generateSlug('ılık')).toBe('ilik');
    });

    it('converts İ to i', () => {
      expect(generateSlug('İstanbul')).toBe('istanbul');
    });

    it('converts ğ to g', () => {
      expect(generateSlug('dağ')).toBe('dag');
    });

    it('converts Ğ to g', () => {
      expect(generateSlug('Ğ harfi')).toBe('g-harfi');
    });

    it('converts ü to u', () => {
      expect(generateSlug('üç')).toBe('uc');
    });

    it('converts Ü to u', () => {
      expect(generateSlug('Üsküdar')).toBe('uskudar');
    });

    it('converts ö to o', () => {
      expect(generateSlug('özel')).toBe('ozel');
    });

    it('converts Ö to o', () => {
      expect(generateSlug('Özel')).toBe('ozel');
    });

    it('converts ç to c', () => {
      expect(generateSlug('çok')).toBe('cok');
    });

    it('converts Ç to c', () => {
      expect(generateSlug('Çok')).toBe('cok');
    });

    it('handles mixed Turkish characters in a real title', () => {
      expect(generateSlug('İstanbul Şişli 3+1 Daire')).toBe('istanbul-sisli-31-daire');
    });
  });

  describe('lowercase conversion', () => {
    it('converts uppercase ASCII letters to lowercase', () => {
      expect(generateSlug('HELLO WORLD')).toBe('hello-world');
    });

    it('handles mixed case', () => {
      expect(generateSlug('Hello World')).toBe('hello-world');
    });
  });

  describe('special character removal', () => {
    it('removes punctuation', () => {
      expect(generateSlug('hello, world!')).toBe('hello-world');
    });

    it('removes parentheses and brackets', () => {
      expect(generateSlug('ilan (özel)')).toBe('ilan-ozel');
    });

    it('keeps digits', () => {
      expect(generateSlug('3+1 daire')).toBe('31-daire');
    });

    it('keeps existing hyphens', () => {
      expect(generateSlug('pre-existing hyphen')).toBe('pre-existing-hyphen');
    });
  });

  describe('space to hyphen conversion', () => {
    it('replaces single space with hyphen', () => {
      expect(generateSlug('hello world')).toBe('hello-world');
    });

    it('replaces multiple spaces with a single hyphen', () => {
      expect(generateSlug('hello   world')).toBe('hello-world');
    });
  });

  describe('consecutive hyphen collapsing', () => {
    it('collapses consecutive hyphens', () => {
      expect(generateSlug('hello--world')).toBe('hello-world');
    });

    it('collapses hyphens created from spaces and existing hyphens', () => {
      expect(generateSlug('hello - world')).toBe('hello-world');
    });
  });

  describe('leading/trailing hyphen trimming', () => {
    it('trims leading hyphens', () => {
      expect(generateSlug('-hello')).toBe('hello');
    });

    it('trims trailing hyphens', () => {
      expect(generateSlug('hello-')).toBe('hello');
    });

    it('trims both leading and trailing hyphens', () => {
      expect(generateSlug('-hello-')).toBe('hello');
    });
  });

  describe('edge cases', () => {
    it('returns empty string for an all-special-char input', () => {
      expect(generateSlug('!!!###')).toBe('');
    });

    it('handles a single Turkish character', () => {
      expect(generateSlug('ş')).toBe('s');
    });

    it('handles a numeric-only title', () => {
      expect(generateSlug('123')).toBe('123');
    });
  });
});

// Feature: property-management-api, Property 1: Slug Format Invariant
import * as fc from 'fast-check';

describe('property-based tests', () => {
  describe('Slug Format Invariant', () => {
    /**
     * Validates: Requirements 1.4
     *
     * For any non-empty string, generateSlug should produce a slug that:
     *  - Contains only [a-z0-9-] characters
     *  - Has no leading or trailing hyphens
     *  - Has no consecutive hyphens
     * OR returns an empty string (when all characters are stripped).
     */
    it('slug matches /^[a-z0-9]+(-[a-z0-9]+)*$/ or is empty', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1 }), (title) => {
          const slug = generateSlug(title);

          // Empty string is acceptable when all chars are stripped
          if (slug === '') return true;

          // Must only contain lowercase alphanumeric and hyphens
          const validChars = /^[a-z0-9-]+$/.test(slug);

          // No leading or trailing hyphens
          const noLeadingHyphen = !slug.startsWith('-');
          const noTrailingHyphen = !slug.endsWith('-');

          // No consecutive hyphens
          const noConsecutiveHyphens = !slug.includes('--');

          return validChars && noLeadingHyphen && noTrailingHyphen && noConsecutiveHyphens;
        }),
        { numRuns: 100 },
      );
    });
  });
});

// Feature: property-management-api, Property 2: Slug Uniqueness Convergence
import { generateUniqueSlug } from '@/modules/property/utils/slugUtils';

describe('Property 2: Slug Uniqueness Convergence', () => {
  /**
   * Validates: Requirements 1.5
   *
   * The new algorithm queries ALL existing slugs with a shared prefix in one
   * call, then returns `baseSlug-(max+1)`.  It never throws — no hard cap.
   *
   * Tests:
   * - No conflicts → returns base slug
   * - N existing slugs (base + base-2 … base-N) → returns base-(N+1)
   * - Gaps in suffix sequence are handled correctly (uses max, not count)
   * - PBT: for any N ∈ [0..50] pre-existing slugs, always resolves
   */

  it('returns base slug when no conflicts exist', async () => {
    const findSlugsByPrefix = jest.fn().mockResolvedValue([]);
    const result = await generateUniqueSlug('test title', findSlugsByPrefix);
    expect(result).toBe('test-title');
  });

  it('returns base-2 when base slug is already taken', async () => {
    const findSlugsByPrefix = jest.fn().mockResolvedValue(['test-title']);
    const result = await generateUniqueSlug('test title', findSlugsByPrefix);
    expect(result).toBe('test-title-2');
  });

  it('returns base-4 when base, base-2, base-3 are taken', async () => {
    const findSlugsByPrefix = jest.fn().mockResolvedValue([
      'test-title',
      'test-title-2',
      'test-title-3',
    ]);
    const result = await generateUniqueSlug('test title', findSlugsByPrefix);
    expect(result).toBe('test-title-4');
  });

  it('handles gaps in suffix sequence — uses max+1, not count+1', async () => {
    // Slugs 2, 5, 10 exist (gaps at 3, 4, 6-9) — next should be 11
    const findSlugsByPrefix = jest.fn().mockResolvedValue([
      'ev',
      'ev-2',
      'ev-5',
      'ev-10',
    ]);
    const result = await generateUniqueSlug('ev', findSlugsByPrefix);
    expect(result).toBe('ev-11');
  });

  it('ignores slugs that match prefix but are not the exact base-N pattern', async () => {
    // 'ev-salon' starts with 'ev' but is not 'ev-<number>' — should not affect suffix
    const findSlugsByPrefix = jest.fn().mockResolvedValue(['ev', 'ev-salon']);
    const result = await generateUniqueSlug('ev', findSlugsByPrefix);
    // 'ev' is taken, max numeric suffix is 1 (default), so next = ev-2
    expect(result).toBe('ev-2');
  });

  // Feature: property-management-api, Property 2: Slug Uniqueness Convergence
  it('PBT: for any N ∈ [0..50] pre-existing slugs, always resolves without error', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 0, max: 50 }), async (n) => {
        // Build a set of N taken slugs: base, base-2, base-3, ..., base-N
        const base = 'test-title';
        const taken: string[] = n === 0 ? [] : [base];
        for (let i = 2; i <= n; i++) taken.push(`${base}-${i}`);

        const findSlugsByPrefix = jest.fn().mockResolvedValue(taken);
        const result = await generateUniqueSlug('test title', findSlugsByPrefix);

        // Must be a non-empty string in correct slug format
        return typeof result === 'string' && result.length > 0 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(result);
      }),
      { numRuns: 100 },
    );
  });
});
