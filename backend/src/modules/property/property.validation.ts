/**
 * Property Module — Zod Validation Schemas
 *
 * createPropertySchema, updatePropertySchema, paginationSchema, idParamSchema
 */

import { z } from 'zod';

// ─── CreatePropertySchema ────────────────────────────────────────────────────
// Required: Requirements 8.1

export const createPropertySchema = z.object({
  // Required fields
  title: z.string().min(1).max(200),
  listingType: z.enum(['FOR_SALE', 'FOR_RENT']),
  propertyType: z.enum(['APARTMENT', 'HOUSE', 'LAND', 'OFFICE', 'SHOP', 'WAREHOUSE', 'OTHER']),
  price: z.number().positive(),
  city: z.string().min(1),
  district: z.string().min(1),
  address: z.string().min(1),

  // Optional fields matching PropertyDto
  description: z.string().optional(),
  neighborhood: z.string().optional(),
  grossArea: z.number().positive().optional(),
  netArea: z.number().positive().optional(),
  roomCount: z.number().int().min(0).optional(),
  livingRoomCount: z.number().int().min(0).optional(),
  bathroomCount: z.number().int().min(0).optional(),
  floor: z.number().int().optional(),
  totalFloor: z.number().int().min(1).optional(),
  buildingAge: z.number().int().min(0).optional(),
  heatingType: z.string().optional(),
  dues: z.number().min(0).optional(),
  deedStatus: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  videoUrl: z.string().url().optional(),
  virtualTourUrl: z.string().url().optional(),
  furnished: z.boolean().optional(),
  balcony: z.boolean().optional(),
  elevator: z.boolean().optional(),
  parking: z.boolean().optional(),
  eligibleForCredit: z.boolean().optional(),
  exchangeAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

// ─── UpdatePropertySchema ────────────────────────────────────────────────────
// All fields partial + at least one field required — Requirements 8.2

export const updatePropertySchema = createPropertySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'En az bir alan güncellenmeli.',
  });

// ─── PaginationSchema ────────────────────────────────────────────────────────
// Pagination + filter fields with defaults — Requirements 8.3

export const paginationSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    sortBy: z.enum(['price', 'createdAt', 'updatedAt', 'title']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    city: z.string().optional(),
    district: z.string().optional(),
    listingType: z.enum(['FOR_SALE', 'FOR_RENT']).optional(),
    propertyType: z
      .enum(['APARTMENT', 'HOUSE', 'LAND', 'OFFICE', 'SHOP', 'WAREHOUSE', 'OTHER'])
      .optional(),
    isPublished: z.coerce.boolean().optional(),
    minimumPrice: z.coerce.number().positive().optional(),
    maximumPrice: z.coerce.number().positive().optional(),
  })
  .refine(
    (data) =>
      !(data.minimumPrice && data.maximumPrice && data.minimumPrice > data.maximumPrice),
    { message: 'minimumPrice, maximumPrice değerinden büyük olamaz.' },
  );

// ─── IdParamSchema ───────────────────────────────────────────────────────────
// RFC 4122 UUID validation — Requirements 8.4

export const idParamSchema = z.object({
  id: z.string().uuid('Geçerli bir UUID giriniz.'),
});

// ─── Inferred Types ──────────────────────────────────────────────────────────

export type CreatePropertyDto = z.infer<typeof createPropertySchema>;
export type UpdatePropertyDto = z.infer<typeof updatePropertySchema>;
export type PaginationQuery = z.infer<typeof paginationSchema>;
