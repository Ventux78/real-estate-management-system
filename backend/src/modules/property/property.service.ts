/**
 * Property Module — Service Layer
 *
 * Business logic for Property management.
 * Handles user validation, slug generation, and property operations.
 *
 * Requirements: 1.1, 1.6, 1.7, 1.8, 2.1, 2.2, 2.3, 2.5, 2.6, 2.7,
 *               3.1, 3.2, 4.1, 4.3, 4.5, 4.6, 5.1, 5.3, 5.5,
 *               6.1, 6.3, 6.4, 7.1, 7.3, 7.5
 */

import { prisma } from '@/lib/prisma';
import { AppError } from '@/common/errors/AppError';
import { propertyRepository } from './property.repository';
import { generateUniqueSlug } from './utils/slugUtils';

import type { Property, PropertyImage, Prisma } from '@prisma/client';
import { HeatingType, DeedStatus } from '@prisma/client';
import type {
  PropertyDto,
  PropertyImageDto,
  PaginatedPropertyResult,
} from './property.types';
import type { CreatePropertyDto, UpdatePropertyDto, PaginationQuery } from './property.validation';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Maps a Prisma Property (with images) to the serializable PropertyDto.
 * Converts Decimal → number and Date → ISO 8601 string.
 */
function mapToDto(property: Property & { images: PropertyImage[] }): PropertyDto {
  return {
    id: property.id,
    slug: property.slug,
    title: property.title,
    listingType: property.listingType,
    propertyType: property.propertyType,
    price: Number(property.price),
    city: property.city,
    district: property.district,
    address: property.address,
    description: property.description,
    neighborhood: property.neighborhood,
    grossArea: property.grossArea !== null ? Number(property.grossArea) : null,
    netArea: property.netArea !== null ? Number(property.netArea) : null,
    roomCount: property.roomCount,
    livingRoomCount: property.livingRoomCount,
    bathroomCount: property.bathroomCount,
    floor: property.floor,
    totalFloor: property.totalFloor,
    buildingAge: property.buildingAge,
    heatingType: property.heatingType,
    dues: property.dues !== null ? Number(property.dues) : null,
    deedStatus: property.deedStatus,
    latitude: property.latitude !== null ? Number(property.latitude) : null,
    longitude: property.longitude !== null ? Number(property.longitude) : null,
    videoUrl: property.videoUrl,
    virtualTourUrl: property.virtualTourUrl,
    furnished: property.furnished,
    balcony: property.balcony,
    elevator: property.elevator,
    parking: property.parking,
    eligibleForCredit: property.eligibleForCredit,
    exchangeAvailable: property.exchangeAvailable,
    isFeatured: property.isFeatured,
    isPublished: property.isPublished,
    createdById: property.createdById,
    createdAt: property.createdAt.toISOString(),
    updatedAt: property.updatedAt.toISOString(),
    images: property.images.map(
      (img): PropertyImageDto => ({
        id: img.id,
        imageUrl: img.url,
        publicId: img.publicId,
        displayOrder: img.displayOrder,
        isCover: img.isCover,
      }),
    ),
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const propertyService = {
  /**
   * Create a new property.
   *
   * 1. Validate that the user exists (404 if not found).
   * 2. Generate a unique slug from the title.
   * 3. Persist via repository with isPublished = false by default.
   * 4. Log success and return the mapped DTO.
   *
   * Requirements: 1.1, 1.6, 1.7, 1.8
   */
  async createProperty(dto: CreatePropertyDto, userId: string): Promise<PropertyDto> {
    // Step 1 — user existence check
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('Kullanıcı bulunamadı.', 404, 'USER_NOT_FOUND');
    }

    // Step 2 — unique slug generation
    const slug = await generateUniqueSlug(
      dto.title,
      propertyRepository.findSlugsByPrefix.bind(propertyRepository),
    );

    // Step 3 — persist
    const property = await propertyRepository.create({
      title: dto.title,
      slug,
      listingType: dto.listingType,
      propertyType: dto.propertyType,
      price: dto.price,
      city: dto.city,
      district: dto.district,
      address: dto.address,
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.neighborhood !== undefined && { neighborhood: dto.neighborhood }),
      ...(dto.grossArea !== undefined && { grossArea: dto.grossArea }),
      ...(dto.netArea !== undefined && { netArea: dto.netArea }),
      ...(dto.roomCount !== undefined && { roomCount: dto.roomCount }),
      ...(dto.livingRoomCount !== undefined && { livingRoomCount: dto.livingRoomCount }),
      ...(dto.bathroomCount !== undefined && { bathroomCount: dto.bathroomCount }),
      ...(dto.floor !== undefined && { floor: dto.floor }),
      ...(dto.totalFloor !== undefined && { totalFloor: dto.totalFloor }),
      ...(dto.buildingAge !== undefined && { buildingAge: dto.buildingAge }),
      ...(dto.heatingType !== undefined && { heatingType: dto.heatingType as import('@prisma/client').HeatingType }),
      ...(dto.dues !== undefined && { dues: dto.dues }),
      ...(dto.deedStatus !== undefined && { deedStatus: dto.deedStatus as import('@prisma/client').DeedStatus }),
      ...(dto.latitude !== undefined && { latitude: dto.latitude }),
      ...(dto.longitude !== undefined && { longitude: dto.longitude }),
      ...(dto.videoUrl !== undefined && { videoUrl: dto.videoUrl }),
      ...(dto.virtualTourUrl !== undefined && { virtualTourUrl: dto.virtualTourUrl }),
      ...(dto.furnished !== undefined && { furnished: dto.furnished }),
      ...(dto.balcony !== undefined && { balcony: dto.balcony }),
      ...(dto.elevator !== undefined && { elevator: dto.elevator }),
      ...(dto.parking !== undefined && { parking: dto.parking }),
      ...(dto.eligibleForCredit !== undefined && { eligibleForCredit: dto.eligibleForCredit }),
      ...(dto.exchangeAvailable !== undefined && { exchangeAvailable: dto.exchangeAvailable }),
      ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
      isPublished: false,
      createdBy: { connect: { id: userId } },
    });

    // Step 4 — log & return
    console.info('[PropertyService] Property created: id=%s, createdAt=%s', property.id, property.createdAt);
    return mapToDto(property);
  },

  /**
   * List properties with filters and pagination.
   *
   * Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 2.7
   */
  async listProperties(query: PaginationQuery): Promise<PaginatedPropertyResult> {
    const [properties, total] = await propertyRepository.findMany(query);
    const pages = Math.ceil(total / query.limit);

    return {
      data: properties.map(mapToDto),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages,
      },
    };
  },

  /**
   * Retrieve a single property by ID.
   * Throws 404 if the property does not exist or has been soft-deleted.
   *
   * Requirements: 3.1, 3.2
   */
  async getPropertyById(id: string): Promise<PropertyDto> {
    const property = await propertyRepository.findById(id);
    if (!property) {
      throw new AppError('İlan bulunamadı.', 404, 'PROPERTY_NOT_FOUND');
    }
    return mapToDto(property);
  },

  /**
   * Update an existing property.
   *
   * Requirements: 4.1, 4.3, 4.5, 4.6
   */
  async updateProperty(id: string, dto: UpdatePropertyDto): Promise<PropertyDto> {
    // 1. Find existing property
    const existing = await propertyRepository.findById(id);
    if (!existing) {
      throw new AppError('İlan bulunamadı.', 404, 'PROPERTY_NOT_FOUND');
    }

    // 2. If title is being updated, generate new unique slug
    let slug: string | undefined;
    if (dto.title !== undefined) {
      slug = await generateUniqueSlug(
        dto.title,
        propertyRepository.findSlugsByPrefix.bind(propertyRepository),
        id, // excludeId — kept for API compatibility
      );
    }

    // 3. Build update data
    const { heatingType, deedStatus, ...restDto } = dto;
    const updateData: Prisma.PropertyUpdateInput = {
      ...restDto,
      ...(slug !== undefined && { slug }),
      ...(heatingType !== undefined && { heatingType: heatingType as HeatingType }),
      ...(deedStatus !== undefined && { deedStatus: deedStatus as DeedStatus }),
    };

    // 4. Persist
    const updated = await propertyRepository.update(id, updateData);

    // 5. Log & return
    console.info('[PropertyService] Property updated: id=%s, updatedAt=%s', updated.id, updated.updatedAt);
    return mapToDto(updated);
  },

  /**
   * Soft-delete a property by setting deletedAt.
   *
   * Requirements: 5.1, 5.3, 5.5
   */
  async softDeleteProperty(id: string): Promise<void> {
    const existing = await propertyRepository.findById(id);
    if (!existing) {
      throw new AppError('İlan bulunamadı.', 404, 'PROPERTY_NOT_FOUND');
    }
    await propertyRepository.softDelete(id);
    console.info('[PropertyService] Property soft-deleted: id=%s, deletedAt=%s', id, new Date().toISOString());
  },

  /**
   * Publish a property (idempotent — sets isPublished = true).
   *
   * Requirements: 6.1, 6.3, 6.4
   */
  async publishProperty(id: string): Promise<PropertyDto> {
    const existing = await propertyRepository.findById(id);
    if (!existing) {
      throw new AppError('İlan bulunamadı.', 404, 'PROPERTY_NOT_FOUND');
    }
    const updated = await propertyRepository.update(id, { isPublished: true });
    console.info('[PropertyService] Property published: id=%s', id);
    return mapToDto(updated);
  },

  /**
   * Unpublish a property (idempotent — sets isPublished = false).
   *
   * Requirements: 7.1, 7.3, 7.5
   */
  async unpublishProperty(id: string): Promise<PropertyDto> {
    const existing = await propertyRepository.findById(id);
    if (!existing) {
      throw new AppError('İlan bulunamadı.', 404, 'PROPERTY_NOT_FOUND');
    }
    const updated = await propertyRepository.update(id, { isPublished: false });
    console.info('[PropertyService] Property unpublished: id=%s', id);
    return mapToDto(updated);
  },

  /**
   * Get aggregated property statistics.
   *
   * Returns total, published, unpublished and soft-deleted counts.
   * Executed in a single atomic Prisma transaction.
   */
  async getPropertyStats(): Promise<{
    total: number;
    published: number;
    unpublished: number;
    deleted: number;
  }> {
    return propertyRepository.getStats();
  },
};

