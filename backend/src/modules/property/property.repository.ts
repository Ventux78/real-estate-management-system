/**
 * Property Module — Repository Layer
 *
 * Prisma database queries for Property entity.
 * All queries automatically filter soft-deleted records (deletedAt: null),
 * except findBySlug which includes soft-deleted records for uniqueness checks.
 *
 * Requirements: 1.1, 2.1, 2.5, 2.6, 3.1, 5.1, 5.4
 */

import { prisma } from '@/lib/prisma';
import type { Property, Prisma } from '@/generated/prisma-client';

// ─── FindManyParams ───────────────────────────────────────────────────────────

export interface FindManyParams {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  city?: string;
  district?: string;
  listingType?: 'FOR_SALE' | 'FOR_RENT';
  propertyType?: 'APARTMENT' | 'HOUSE' | 'LAND' | 'OFFICE' | 'SHOP' | 'WAREHOUSE' | 'OTHER';
  isPublished?: boolean;
  minimumPrice?: number;
  maximumPrice?: number;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export const propertyRepository = {
  /**
   * Create a new property record with images relation included.
   *
   * Requirements: 1.1
   */
  async create(data: Prisma.PropertyCreateInput): Promise<Property & { images: import('@/generated/prisma-client').PropertyImage[] }> {
    return prisma.property.create({
      data,
      include: { images: true },
    });
  },

  /**
   * Find many properties with filters, pagination, and sorting.
   * Automatically excludes soft-deleted records (deletedAt: null).
   * Returns [properties, totalCount] atomically via $transaction.
   *
   * Requirements: 2.1, 2.5, 2.6
   */
  async findMany(params: FindManyParams): Promise<[Array<Property & { images: import('@/generated/prisma-client').PropertyImage[] }>, number]> {
    const {
      page,
      limit,
      sortBy,
      sortOrder,
      city,
      district,
      listingType,
      propertyType,
      isPublished,
      minimumPrice,
      maximumPrice,
    } = params;

    // Build the where clause — soft-delete always filtered
    const where: Prisma.PropertyWhereInput = {
      deletedAt: null,
      ...(city !== undefined && { city }),
      ...(district !== undefined && { district }),
      ...(listingType !== undefined && { listingType }),
      ...(propertyType !== undefined && { propertyType }),
      ...(isPublished !== undefined && { isPublished }),
      // Price range filter using gte/lte for Decimal field
      ...((minimumPrice !== undefined || maximumPrice !== undefined) && {
        price: {
          ...(minimumPrice !== undefined && { gte: minimumPrice }),
          ...(maximumPrice !== undefined && { lte: maximumPrice }),
        },
      }),
    };

    const skip = (page - 1) * limit;

    const [data, total] = await prisma.$transaction([
      prisma.property.findMany({
        where,
        include: { images: true },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.property.count({ where }),
    ]);

    return [data, total];
  },

  /**
   * Find a single property by ID.
   * Excludes soft-deleted records (deletedAt: null).
   * Images are included.
   *
   * Requirements: 3.1
   */
  async findById(id: string): Promise<(Property & { images: import('@/generated/prisma-client').PropertyImage[] }) | null> {
    return prisma.property.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: { images: true },
    });
  },

  /**
   * Update a property by ID.
   * Images are included in the returned record.
   *
   * Requirements: 4.1
   */
  async update(
    id: string,
    data: Prisma.PropertyUpdateInput,
  ): Promise<Property & { images: import('@/generated/prisma-client').PropertyImage[] }> {
    return prisma.property.update({
      where: { id },
      data,
      include: { images: true },
    });
  },

  /**
   * Soft-delete a property by setting deletedAt to the current timestamp.
   *
   * Requirements: 5.1, 5.4
   */
  async softDelete(id: string): Promise<Property & { images: import('@/generated/prisma-client').PropertyImage[] }> {
    return prisma.property.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: { images: true },
    });
  },

  /**
   * Find a property by slug for uniqueness checks.
   * NOTE: Intentionally includes soft-deleted records so slugs from deleted
   * properties are not reused.
   *
   * Requirements: 1.5
   */
  async findBySlug(slug: string): Promise<Property | null> {
    return prisma.property.findUnique({
      where: { slug },
    });
  },

  /**
   * Find all slugs that start with the given prefix.
   * Used by the slug generation algorithm to determine the next available
   * numeric suffix without a fixed probe limit.
   *
   * Includes soft-deleted records so their slugs are never reused.
   * Only the `slug` field is selected to keep the query lightweight.
   *
   * Requirements: 1.5
   */
  async findSlugsByPrefix(prefix: string): Promise<string[]> {
    const rows = await prisma.property.findMany({
      where: {
        slug: { startsWith: prefix },
      },
      select: { slug: true },
    });
    return rows.map((r) => r.slug);
  },

  /**
   * Get property statistics in a single atomic transaction.
   *
   * Counts:
   *   - total:       All non-deleted properties
   *   - published:   Non-deleted AND isPublished = true
   *   - unpublished: Non-deleted AND isPublished = false
   *   - deleted:     Soft-deleted properties (deletedAt IS NOT NULL)
   *
   * Uses prisma.$transaction to ensure snapshot consistency.
   */
  async getStats(): Promise<{
    total: number;
    published: number;
    unpublished: number;
    deleted: number;
  }> {
    const [total, published, unpublished, deleted] = await prisma.$transaction([
      prisma.property.count({ where: { deletedAt: null } }),
      prisma.property.count({ where: { deletedAt: null, isPublished: true } }),
      prisma.property.count({ where: { deletedAt: null, isPublished: false } }),
      prisma.property.count({ where: { deletedAt: { not: null } } }),
    ]);

    return { total, published, unpublished, deleted };
  },
};

