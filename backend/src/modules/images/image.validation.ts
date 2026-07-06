import { z } from 'zod';

export const reorderImagesSchema = z.object({
  body: z.object({
    images: z.array(
      z.object({
        id: z.string().uuid(),
        displayOrder: z.number().int().min(0),
      })
    ).min(1, 'En az bir görsel sırası gereklidir'),
  }),
});

export const imageIdParamSchema = z.object({
  imageId: z.string().uuid('Geçersiz image UUID'),
});

export const propertyIdParamSchema = z.object({
  id: z.string().uuid('Geçersiz property UUID'),
});
