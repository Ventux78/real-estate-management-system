import { generateGoogleMapsUrl, isValidGoogleMapsUrl } from '../../../src/modules/property/utils/mapsUrl.utils';

describe('mapsUrl.utils', () => {
  describe('generateGoogleMapsUrl', () => {
    it('should generate valid Google Maps search URL with full address details', () => {
      const url = generateGoogleMapsUrl('7412 Sokak No:18', 'PTT Evleri', 'Yüreğir', 'Adana');
      expect(url).toContain('https://www.google.com/maps/search/?api=1&query=');
      expect(url).toContain(encodeURIComponent('7412 Sokak No:18 PTT Evleri Yüreğir Adana Türkiye'));
    });

    it('should generate valid Google Maps URL when address detail is missing', () => {
      const url = generateGoogleMapsUrl(null, 'PTT Evleri', 'Yüreğir', 'Adana');
      expect(url).toContain(encodeURIComponent('PTT Evleri Yüreğir Adana Türkiye'));
    });
  });

  describe('isValidGoogleMapsUrl', () => {
    it('should return true for valid Google Maps domain formats', () => {
      expect(isValidGoogleMapsUrl('https://maps.app.goo.gl/xyz123')).toBe(true);
      expect(isValidGoogleMapsUrl('https://goo.gl/maps/abc456')).toBe(true);
      expect(isValidGoogleMapsUrl('https://maps.google.com/?q=Adana')).toBe(true);
      expect(isValidGoogleMapsUrl('https://www.google.com/maps/place/Adana')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(isValidGoogleMapsUrl('https://example.com')).toBe(false);
      expect(isValidGoogleMapsUrl('https://google.com/search?q=test')).toBe(false);
      expect(isValidGoogleMapsUrl('')).toBe(false);
      expect(isValidGoogleMapsUrl(null)).toBe(false);
    });
  });
});
