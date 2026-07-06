/**
 * Property Module — Controller Layer
 *
 * HTTP handlers for Property API endpoints.
 * Validates input with Zod, calls service, formats SuccessResponse.
 *
 * Requirements: 1.1, 1.2, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 9.1
 */

import { Request, Response, NextFunction } from 'express';
import { propertyService } from './property.service';
import {
  createPropertySchema,
  updatePropertySchema,
  paginationSchema,
  idParamSchema,
} from './property.validation';
import type { SuccessResponse } from '@/common/types/response.types';
import type { PropertyDto, PaginatedPropertyResult } from './property.types';

export const propertyController = {
  /**
   * POST /api/v1/properties
   * Create a new property listing.
   * Returns 201 with the created PropertyDto.
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = createPropertySchema.parse(req.body);
      const userId = req.user!.id;
      const property = await propertyService.createProperty(dto, userId);
      const response: SuccessResponse<PropertyDto> = { success: true, data: property };
      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/properties
   * List properties with optional filters and pagination.
   * Returns 200 with paginated PropertyDto array.
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = paginationSchema.parse(req.query);
      const result = await propertyService.listProperties(query);
      const response: SuccessResponse<PaginatedPropertyResult> = { success: true, data: result };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/properties/:id
   * Retrieve a single property by UUID.
   * Returns 200 with the PropertyDto or 404 if not found.
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = idParamSchema.parse(req.params);
      const property = await propertyService.getPropertyById(id);
      const response: SuccessResponse<PropertyDto> = { success: true, data: property };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/v1/properties/:id
   * Update an existing property.
   * Returns 200 with the updated PropertyDto or 404 if not found.
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = idParamSchema.parse(req.params);
      const dto = updatePropertySchema.parse(req.body);
      const property = await propertyService.updateProperty(id, dto);
      const response: SuccessResponse<PropertyDto> = { success: true, data: property };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /api/v1/properties/:id
   * Soft-delete a property (sets deletedAt, does not remove from DB).
   * Returns 200 with a success message.
   */
  async softDelete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = idParamSchema.parse(req.params);
      await propertyService.softDeleteProperty(id);
      const response: SuccessResponse<{ message: string }> = {
        success: true,
        data: { message: 'İlan başarıyla silindi.' },
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/v1/properties/:id/publish
   * Publish a property (sets isPublished = true).
   * Returns 200 with the updated PropertyDto.
   */
  async publish(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = idParamSchema.parse(req.params);
      const property = await propertyService.publishProperty(id);
      const response: SuccessResponse<PropertyDto> = { success: true, data: property };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/v1/properties/:id/unpublish
   * Unpublish a property (sets isPublished = false).
   * Returns 200 with the updated PropertyDto.
   */
  async unpublish(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = idParamSchema.parse(req.params);
      const property = await propertyService.unpublishProperty(id);
      const response: SuccessResponse<PropertyDto> = { success: true, data: property };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/properties/stats
   * Returns aggregated property statistics:
   *   - total:       All active (non-deleted) listings
   *   - published:   Active listings with isPublished = true
   *   - unpublished: Active listings with isPublished = false
   *   - deleted:     Soft-deleted listings
   *
   * Public endpoint — no authentication required.
   */
  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await propertyService.getPropertyStats();
      const response: SuccessResponse<typeof stats> = { success: true, data: stats };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  },
};

