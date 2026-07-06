/**
 * Property Module — TypeScript Type Definitions
 *
 * PropertyDto, PropertyImageDto, PaginatedPropertyResult and related types.
 * Prisma Decimal/Date fields are mapped to number/string for API serialization.
 */

// ─── PropertyImageDto ─────────────────────────────────────────────────────────

export interface PropertyImageDto {
  id: string;
  imageUrl: string;
  publicId: string;
  displayOrder: number;
  isCover: boolean;
}

// ─── PropertyDto ─────────────────────────────────────────────────────────────

export interface PropertyDto {
  id: string;
  slug: string;
  title: string;
  listingType: 'FOR_SALE' | 'FOR_RENT';
  propertyType: 'APARTMENT' | 'HOUSE' | 'LAND' | 'OFFICE' | 'SHOP' | 'WAREHOUSE' | 'OTHER';
  /** Prisma Decimal → number */
  price: number;
  city: string;
  district: string;
  address: string;
  description: string | null;
  neighborhood: string | null;
  /** Prisma Decimal → number */
  grossArea: number | null;
  /** Prisma Decimal → number */
  netArea: number | null;
  roomCount: number | null;
  livingRoomCount: number | null;
  bathroomCount: number | null;
  floor: number | null;
  totalFloor: number | null;
  buildingAge: number | null;
  /** HeatingType enum → string for flexibility */
  heatingType: string | null;
  /** Prisma Decimal → number */
  dues: number | null;
  /** DeedStatus enum → string for flexibility */
  deedStatus: string | null;
  latitude: number | null;
  longitude: number | null;
  videoUrl: string | null;
  virtualTourUrl: string | null;
  furnished: boolean;
  balcony: boolean;
  elevator: boolean;
  parking: boolean;
  eligibleForCredit: boolean;
  exchangeAvailable: boolean;
  isFeatured: boolean;
  isPublished: boolean;
  createdById: string;
  /** Prisma DateTime → ISO 8601 string */
  createdAt: string;
  /** Prisma DateTime → ISO 8601 string */
  updatedAt: string;
  images: PropertyImageDto[];
}

// ─── PaginatedPropertyResult ──────────────────────────────────────────────────

export interface PaginatedPropertyResult {
  data: PropertyDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    /** Math.ceil(total / limit) */
    pages: number;
  };
}

// ─── CreatePropertyDto / UpdatePropertyDto ────────────────────────────────────
// These types are derived from Zod schemas via `z.infer<>` in property.validation.ts

export type { CreatePropertyDto, UpdatePropertyDto } from './property.validation';
