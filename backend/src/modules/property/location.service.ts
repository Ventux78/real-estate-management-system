/**
 * Property Module — Location Service
 *
 * Validates İl -> İlçe -> Mahalle hierarchy using local Turkey location data.
 */

import fs from 'fs';
import path from 'path';

type LocationData = Record<string, Record<string, string[]>>;

function normalizeString(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/i̇/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'c');
}

class LocationService {
  private locations: LocationData = {};

  constructor() {
    this.loadData();
  }

  private loadData(): void {
    try {
      const dataPath = path.join(__dirname, '../../data/turkey_locations.json');
      if (fs.existsSync(dataPath)) {
        const raw = fs.readFileSync(dataPath, 'utf-8');
        this.locations = JSON.parse(raw);
      } else {
        console.warn('[LocationService] turkey_locations.json file not found at', dataPath);
      }
    } catch (error) {
      console.error('[LocationService] Error loading location data:', error);
    }
  }

  public getProvinces(): string[] {
    return Object.keys(this.locations).sort((a, b) => a.localeCompare(b, 'tr'));
  }

  public getDistricts(province: string): string[] {
    const provKey = this.findMatchingKey(Object.keys(this.locations), province);
    if (!provKey) return [];
    const provData = self_get(this.locations, provKey);
    if (!provData) return [];
    return Object.keys(provData).sort((a, b) => a.localeCompare(b, 'tr'));
  }

  public getNeighborhoods(province: string, district: string): string[] {
    const provKey = this.findMatchingKey(Object.keys(this.locations), province);
    if (!provKey) return [];

    const provData = self_get(this.locations, provKey);
    if (!provData) return [];

    const distKey = this.findMatchingKey(Object.keys(provData), district);
    if (!distKey) return [];

    const neighList = self_get(provData, distKey);
    if (!neighList) return [];

    return neighList.slice().sort((a, b) => a.localeCompare(b, 'tr'));
  }

  /**
   * Validates if province -> district -> neighborhood combination is valid.
   */
  public isValidLocation(province?: string | null, district?: string | null, neighborhood?: string | null): boolean {
    if (!province || !district || !neighborhood) {
      return false;
    }

    const neighborhoods = this.getNeighborhoods(province.trim(), district.trim());
    if (neighborhoods.length === 0) {
      return false;
    }

    const match = this.findMatchingKey(neighborhoods, neighborhood.trim());
    return match !== null;
  }

  private findMatchingKey(keys: string[], target: string): string | null {
    const cleanTarget = normalizeString(target);
    for (const key of keys) {
      const cleanKey = normalizeString(key);
      const cleanKeyBase = cleanKey.replace(/\s*\([^)]*\)/g, '').trim();
      if (cleanKey === cleanTarget || cleanKeyBase === cleanTarget) {
        return key;
      }
    }
    return null;
  }
}

function self_get<T>(obj: Record<string, T>, key: string): T | undefined {
  return Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
}

export const locationService = new LocationService();
