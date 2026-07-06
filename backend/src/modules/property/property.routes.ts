/**
 * Property Module — Express Routes
 *
 * Defines public and protected routes for Property API.
 *
 * Requirements: 1.2, 2.1, 4.2, 5.2, 6.2, 7.2
 */

import { Router } from 'express';
import { authenticate } from '@/modules/auth/auth.middleware';
import { propertyController } from './property.controller';

const propertyRouter = Router();

// Public routes

/**
 * @swagger
 * /properties/stats:
 *   get:
 *     summary: Retrieve property statistics
 *     tags: [Properties]
 *     responses:
 *       200:
 *         description: OK
 */
propertyRouter.get('/stats', propertyController.getStats);  // /stats MUST be before /:id
/**
 * @swagger
 * /properties:
 *   get:
 *     summary: List all properties with optional filters
 *     tags: [Properties]
 *     responses:
 *       200:
 *         description: OK
 */
propertyRouter.get('/', propertyController.list);

/**
 * @swagger
 * /properties/{id}:
 *   get:
 *     summary: Get a property by ID
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *       404:
 *         description: Not Found
 */
propertyRouter.get('/:id', propertyController.getById);

// Protected routes
propertyRouter.post('/', authenticate, propertyController.create);
propertyRouter.put('/:id', authenticate, propertyController.update);
propertyRouter.delete('/:id', authenticate, propertyController.softDelete);
propertyRouter.patch('/:id/publish', authenticate, propertyController.publish);
propertyRouter.patch('/:id/unpublish', authenticate, propertyController.unpublish);

export default propertyRouter;
