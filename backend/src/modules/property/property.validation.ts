/**
 * Property Module — Zod Validation Schemas
 *
 * createPropertySchema, updatePropertySchema, paginationSchema, idParamSchema
 */

import { z } from 'zod';
import { isValidGoogleMapsUrl } from './utils/mapsUrl.utils';

// ─── Base Property Schema ───────────────────────────────────────────────────

const basePropertySchema = z.object({
  // Required fields
  title: z.string().min(1).max(200),
  listingType: z.enum(['FOR_SALE', 'FOR_RENT']),
  propertyType: z.enum(['APARTMENT', 'HOUSE', 'LAND', 'OFFICE', 'SHOP', 'WAREHOUSE', 'OTHER']),
  price: z.number().positive(),
  city: z.string().min(1).optional(),
  province: z.string().min(1).optional(),
  district: z.string().min(1),
  neighborhood: z.string().min(1),
  address: z.string().min(1),

  // Optional fields matching PropertyDto
  description: z.string().optional(),
  grossArea: z.number().positive().optional(),
  netArea: z.number().positive().optional(),
  roomCount: z.number().int().min(0).optional(),
  livingRoomCount: z.number().int().min(0).optional(),
  bathroomCount: z.number().int().min(0).optional(),
  floor: z.number().int().optional(),
  totalFloor: z.number().int().min(1).optional(),
  buildingAge: z.number().int().min(0).optional(),
  heatingType: z.enum(['NATURAL_GAS', 'ELECTRIC', 'FLOOR_HEATING', 'COAL', 'NONE', 'OTHER']).optional(),
  dues: z.number().min(0).optional(),
  deedStatus: z.enum(['FREEHOLD', 'CONDOMINIUM', 'FLOOR_EASEMENT', 'SHARED', 'OTHER']).optional(),
  kitchenType: z.enum(['OPEN', 'CLOSED']).nullable().optional(),
  extraRoom: z.string().nullable().optional(),
  unitsPerFloor: z.number().int().min(1).nullable().optional(),
  wcType: z.enum(['ALAFRANGA', 'ALATURKA', 'BOTH']).nullable().optional(),
  inComplex: z.boolean().optional(),
  complexName: z.string().nullable().optional(),
  socialAmenities: z.array(z.string()).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  videoUrl: z.string().url().optional(),
  virtualTourUrl: z.string().url().optional(),
  mapUrl: z.string().nullable().optional(),
  isMapUrlManual: z.boolean().optional(),
  furnished: z.boolean().optional(),
  balcony: z.boolean().optional(),
  elevator: z.boolean().optional(),
  parking: z.boolean().optional(),
  eligibleForCredit: z.boolean().optional(),
  exchangeAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

// ─── CreatePropertySchema ────────────────────────────────────────────────────

export const createPropertySchema = basePropertySchema
  .refine((data) => !!(data.city || data.province), {
    message: 'İl (city veya province) alanı zorunludur.',
    path: ['city'],
  })
  .refine(
    (data) => {
      if (data.isMapUrlManual) {
        return !!data.mapUrl && isValidGoogleMapsUrl(data.mapUrl);
      }
      return true;
    },
    {
      message: 'Manuel modda geçerli bir Google Maps bağlantısı girilmesi zorunludur.',
      path: ['mapUrl'],
    },
  );

// ─── UpdatePropertySchema ────────────────────────────────────────────────────

export const updatePropertySchema = basePropertySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'En az bir alan güncellenmeli.',
  })
  .refine(
    (data) => {
      if (data.isMapUrlManual) {
        return !!data.mapUrl && isValidGoogleMapsUrl(data.mapUrl);
      }
      return true;
    },
    {
      message: 'Manuel modda geçerli bir Google Maps bağlantısı girilmesi zorunludur.',
      path: ['mapUrl'],
    },
  );

// ─── PaginationSchema ────────────────────────────────────────────────────────

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

export const idParamSchema = z.object({
  id: z.string().uuid('Geçerli bir UUID giriniz.'),
});

// ─── Inferred Types ──────────────────────────────────────────────────────────

export type CreatePropertyDto = z.infer<typeof createPropertySchema>;
export type UpdatePropertyDto = z.infer<typeof updatePropertySchema>;
export type PaginationQuery = z.infer<typeof paginationSchema>;
