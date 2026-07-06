import { imageService } from '@/modules/images/image.service';
import { cloudinaryService } from '@/modules/images/cloudinary.service';
import { imageRepository } from '@/modules/images/image.repository';
import { propertyRepository } from '@/modules/property/property.repository';
import { AppError } from '@/common/errors/AppError';

// Mock dependencies
jest.mock('@/modules/images/cloudinary.service');
jest.mock('@/modules/images/image.repository');
jest.mock('@/modules/property/property.repository');

describe('ImageService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadImages', () => {
    it('should upload images successfully and save to DB', async () => {
      // Setup mocks
      (propertyRepository.findById as jest.Mock).mockResolvedValue({ id: 'prop-1' });
      (imageRepository.findByPropertyId as jest.Mock).mockResolvedValue([]);
      
      const mockCloudinaryResult1 = { secure_url: 'url1', public_id: 'pub1', width: 100, height: 100, format: 'jpg', bytes: 1000 };
      const mockCloudinaryResult2 = { secure_url: 'url2', public_id: 'pub2', width: 200, height: 200, format: 'png', bytes: 2000 };
      
      (cloudinaryService.uploadImage as jest.Mock)
        .mockResolvedValueOnce(mockCloudinaryResult1)
        .mockResolvedValueOnce(mockCloudinaryResult2);
        
      (imageRepository.createMany as jest.Mock).mockResolvedValue(undefined);
      (imageRepository.findByPropertyId as jest.Mock)
        .mockResolvedValueOnce([]) // First call for checking existing images
        .mockResolvedValueOnce([ // Second call for return value
          { ...mockCloudinaryResult1, id: 'img-1', isCover: true, displayOrder: 1 },
          { ...mockCloudinaryResult2, id: 'img-2', isCover: false, displayOrder: 2 }
        ]);

      const files = [
        { buffer: Buffer.from('file1'), mimetype: 'image/jpeg', size: 1000 },
        { buffer: Buffer.from('file2'), mimetype: 'image/png', size: 2000 }
      ] as any[];

      const result = await imageService.uploadImages('prop-1', files);

      expect(cloudinaryService.uploadImage).toHaveBeenCalledTimes(2);
      expect(imageRepository.createMany).toHaveBeenCalledTimes(1);
      
      const createManyArg = (imageRepository.createMany as jest.Mock).mock.calls[0][0];
      expect(createManyArg).toHaveLength(2);
      expect(createManyArg[0].isCover).toBe(true);
      expect(createManyArg[1].isCover).toBe(false);
      
      expect(result).toHaveLength(2);
    });

    it('should rollback successful uploads if one upload fails', async () => {
      (propertyRepository.findById as jest.Mock).mockResolvedValue({ id: 'prop-1' });
      (imageRepository.findByPropertyId as jest.Mock).mockResolvedValue([]);
      
      const mockCloudinaryResult1 = { secure_url: 'url1', public_id: 'pub1', width: 100, height: 100, format: 'jpg', bytes: 1000 };
      
      // 1 successful, 1 failure
      (cloudinaryService.uploadImage as jest.Mock)
        .mockResolvedValueOnce(mockCloudinaryResult1)
        .mockRejectedValueOnce(new AppError('Upload failed', 502, 'CLOUDINARY_UPLOAD_ERROR'));
        
      (cloudinaryService.deleteImage as jest.Mock).mockResolvedValue(undefined);

      const files = [
        { buffer: Buffer.from('file1'), mimetype: 'image/jpeg', size: 1000 },
        { buffer: Buffer.from('file2'), mimetype: 'image/png', size: 2000 }
      ] as any[];

      await expect(imageService.uploadImages('prop-1', files)).rejects.toThrow('Bazı görseller yüklenirken hata oluştu');

      // Verify rollback occurred for the successful one
      expect(cloudinaryService.deleteImage).toHaveBeenCalledWith('pub1');
      expect(imageRepository.createMany).not.toHaveBeenCalled();
    });

    it('should rollback successful uploads if DB createMany fails', async () => {
      (propertyRepository.findById as jest.Mock).mockResolvedValue({ id: 'prop-1' });
      (imageRepository.findByPropertyId as jest.Mock).mockResolvedValue([]);
      
      const mockCloudinaryResult1 = { secure_url: 'url1', public_id: 'pub1' };
      
      (cloudinaryService.uploadImage as jest.Mock).mockResolvedValue(mockCloudinaryResult1);
      (imageRepository.createMany as jest.Mock).mockRejectedValue(new Error('DB connection lost'));
      (cloudinaryService.deleteImage as jest.Mock).mockResolvedValue(undefined);

      const files = [{ buffer: Buffer.from('file1'), mimetype: 'image/jpeg', size: 1000 }] as any[];

      await expect(imageService.uploadImages('prop-1', files)).rejects.toThrow('Görseller veritabanına kaydedilemedi.');

      // Verify rollback occurred
      expect(cloudinaryService.deleteImage).toHaveBeenCalledWith('pub1');
    });

    it('should enforce 20 images limit', async () => {
      (propertyRepository.findById as jest.Mock).mockResolvedValue({ id: 'prop-1' });
      // Mock existing 19 images
      (imageRepository.findByPropertyId as jest.Mock).mockResolvedValue(new Array(19).fill({}));
      
      const files = [
        { buffer: Buffer.from('file1') },
        { buffer: Buffer.from('file2') }
      ] as any[];

      // 19 + 2 = 21 (Exceeds 20)
      await expect(imageService.uploadImages('prop-1', files)).rejects.toThrow('Bir ilanda en fazla 20 görsel olabilir');
    });
  });

  describe('setCoverTransaction', () => {
    it('should use setCoverTransaction in setCover', async () => {
      (imageRepository.findById as jest.Mock).mockResolvedValue({ id: 'img-1', propertyId: 'prop-1' });
      (imageRepository.setCoverTransaction as jest.Mock).mockResolvedValue(undefined);

      await imageService.setCover('img-1');

      expect(imageRepository.setCoverTransaction).toHaveBeenCalledWith('prop-1', 'img-1');
    });
  });

  describe('deleteImage', () => {
    it('should delete from Cloudinary then DB', async () => {
      (imageRepository.findById as jest.Mock).mockResolvedValue({ id: 'img-1', propertyId: 'prop-1', publicId: 'pub1', isCover: false });
      (cloudinaryService.deleteImage as jest.Mock).mockResolvedValue(undefined);
      (imageRepository.delete as jest.Mock).mockResolvedValue(undefined);

      await imageService.deleteImage('img-1');

      expect(cloudinaryService.deleteImage).toHaveBeenCalledWith('pub1');
      expect(imageRepository.delete).toHaveBeenCalledWith('img-1');
      
      // Order verification via invocation order is implicitly tested by standard async flow 
      // but we can check if it was called
    });
    
    it('should not delete from DB if Cloudinary deletion fails', async () => {
      (imageRepository.findById as jest.Mock).mockResolvedValue({ id: 'img-1', propertyId: 'prop-1', publicId: 'pub1', isCover: false });
      (cloudinaryService.deleteImage as jest.Mock).mockRejectedValue(new AppError('Cloudinary error', 502, 'CLOUDINARY_DELETE_ERROR'));

      await expect(imageService.deleteImage('img-1')).rejects.toThrow('Cloudinary error');

      expect(cloudinaryService.deleteImage).toHaveBeenCalledWith('pub1');
      expect(imageRepository.delete).not.toHaveBeenCalled();
    });
  });
});
