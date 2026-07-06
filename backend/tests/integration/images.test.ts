import request from 'supertest';
import { createApp } from '@/app';
import { prisma } from '@/lib/prisma';
import { generateAccessToken } from '@/utils/jwt.util';
import { cloudinaryService } from '@/modules/images/cloudinary.service';
import path from 'path';
import fs from 'fs';

// Mock Cloudinary completely
jest.mock('@/modules/images/cloudinary.service');

const app = createApp();

describe('Images API Integration Tests', () => {
  let token: string;
  let testPropertyId: string;
  let testImageBuffer: Buffer;

  beforeAll(async () => {
    // Generate an empty dummy image buffer
    testImageBuffer = Buffer.from('dummy image data');

    // Create a user and a property for testing
    const user = await prisma.user.create({
      data: {
        username: 'image_test_user',
        email: 'image_test@example.com',
        passwordHash: 'hash',
      },
    });
    token = generateAccessToken({ sub: user.id, username: user.username });

    const property = await prisma.property.create({
      data: {
        slug: 'image-test-property',
        title: 'Image Test',
        listingType: 'FOR_SALE',
        propertyType: 'HOUSE',
        price: 100000,
        city: 'Istanbul',
        district: 'Kadikoy',
        address: 'Test Addr',
        createdById: user.id,
      },
    });
    testPropertyId = property.id;
  });

  afterAll(async () => {
    await prisma.property.deleteMany({ where: { id: testPropertyId } });
    await prisma.user.deleteMany({ where: { username: 'image_test_user' } });
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await prisma.propertyImage.deleteMany({ where: { propertyId: testPropertyId } });
  });

  describe('POST /api/v1/properties/:id/images', () => {
    it('should upload single valid image', async () => {
      (cloudinaryService.uploadImage as jest.Mock).mockResolvedValue({
        secure_url: 'http://res.cloudinary.com/demo/image/upload/v1/test.jpg',
        public_id: 'test_id',
        width: 800,
        height: 600,
        format: 'jpg',
        bytes: 1024,
      });

      const res = await request(app)
        .post(`/api/v1/properties/${testPropertyId}/images`)
        .set('Authorization', `Bearer ${token}`)
        .attach('images', testImageBuffer, 'test.jpg');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].url).toBe('http://res.cloudinary.com/demo/image/upload/v1/test.jpg');
      expect(res.body.data[0].isCover).toBe(true); // First image should be cover
    });

    it('should reject non-image file extensions', async () => {
      const res = await request(app)
        .post(`/api/v1/properties/${testPropertyId}/images`)
        .set('Authorization', `Bearer ${token}`)
        // We simulate a PDF file sent as image/jpeg (MIME spoofing) to test our regex check
        .attach('images', testImageBuffer, { filename: 'malicious.pdf', contentType: 'image/jpeg' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
    });

    it('should enforce 10MB limit', async () => {
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11 MB
      const res = await request(app)
        .post(`/api/v1/properties/${testPropertyId}/images`)
        .set('Authorization', `Bearer ${token}`)
        .attach('images', largeBuffer, 'large.jpg');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FILE_TOO_LARGE');
    });

    it('should rollback Cloudinary and DB on partial failure', async () => {
      (cloudinaryService.uploadImage as jest.Mock)
        .mockResolvedValueOnce({
          secure_url: 'url1', public_id: 'pub1', width: 800, height: 600, format: 'jpg', bytes: 1024
        })
        .mockRejectedValueOnce(new Error('Cloudinary partial upload failure'));

      (cloudinaryService.deleteImage as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .post(`/api/v1/properties/${testPropertyId}/images`)
        .set('Authorization', `Bearer ${token}`)
        .attach('images', testImageBuffer, 'test1.jpg')
        .attach('images', testImageBuffer, 'test2.jpg');

      expect(res.status).toBe(502);
      expect(res.body.error.code).toBe('PARTIAL_UPLOAD_ERROR');

      // Ensure rollback was called for the successful one
      expect(cloudinaryService.deleteImage).toHaveBeenCalledWith('pub1');

      // DB should be empty
      const dbImages = await prisma.propertyImage.findMany({ where: { propertyId: testPropertyId } });
      expect(dbImages.length).toBe(0);
    });
  });

  describe('PATCH /api/v1/images/:imageId/cover', () => {
    it('should set cover image atomically and clear others', async () => {
      // First, create two images
      const img1 = await prisma.propertyImage.create({
        data: { propertyId: testPropertyId, url: 'url1', publicId: 'pub1', isCover: true, displayOrder: 1, width: 1, height: 1, format: 'jpg', bytes: 1 }
      });
      const img2 = await prisma.propertyImage.create({
        data: { propertyId: testPropertyId, url: 'url2', publicId: 'pub2', isCover: false, displayOrder: 2, width: 1, height: 1, format: 'jpg', bytes: 1 }
      });

      // Now set img2 as cover
      const res = await request(app)
        .patch(`/api/v1/images/${img2.id}/cover`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      // Verify DB
      const dbImg1 = await prisma.propertyImage.findUnique({ where: { id: img1.id } });
      const dbImg2 = await prisma.propertyImage.findUnique({ where: { id: img2.id } });

      expect(dbImg1?.isCover).toBe(false);
      expect(dbImg2?.isCover).toBe(true);
    });
  });
});
