import { locationService } from '../../src/modules/property/location.service';

describe('locationService validation', () => {
  it('accepts a known province-district-neighborhood combination from the backend data file', () => {
    expect(locationService.isValidLocation('Ankara', 'Çankaya', 'Kızılay')).toBe(true);
  });

  it('rejects a mismatched neighborhood even when the province and district are valid', () => {
    expect(locationService.isValidLocation('Ankara', 'Çankaya', 'Kızılayx')).toBe(false);
  });
});
