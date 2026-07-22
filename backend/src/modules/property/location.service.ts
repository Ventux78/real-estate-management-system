/**
 * Property Module — Location Service
 *
 * Validates İl -> İlçe -> Mahalle hierarchy using local Turkey location data.
 */

import fs from 'fs';
import path from 'path';

const DEBUG = process.env.NODE_ENV !== 'production';

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
    const candidatePaths = this.getCandidateDataPaths();

    for (const dataPath of candidatePaths) {
      try {
        if (fs.existsSync(dataPath)) {
          const raw = fs.readFileSync(dataPath, 'utf-8');
          this.locations = JSON.parse(raw);
          if (DEBUG) {
            console.debug(`[LocationService] Loaded location data from ${dataPath}`);
          }
          return;
        }
      } catch (error) {
        console.error(`[LocationService] Error loading location data from ${dataPath}:`, error);
      }
    }

    console.warn('[LocationService] No usable location dataset found. Tried paths:', candidatePaths);
  }

  private getCandidateDataPaths(): string[] {
    const cwd = process.cwd();
    const dirname = __dirname;
    const candidates = [
      path.resolve(cwd, 'src/data/turkey_locations.json'),
      path.resolve(cwd, 'backend/src/data/turkey_locations.json'),
      path.resolve(cwd, 'admin/app/data/turkey_locations.json'),
      path.resolve(dirname, '../../data/turkey_locations.json'),
      path.resolve(dirname, '../../../src/data/turkey_locations.json'),
      path.resolve(dirname, '../../src/data/turkey_locations.json'),
      path.resolve(dirname, '../../../admin/app/data/turkey_locations.json'),
    ];

    return [...new Set(candidates)];
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
    const incomingProvince = province?.trim() ?? '';
    const incomingDistrict = district?.trim() ?? '';
    const incomingNeighborhood = neighborhood?.trim() ?? '';

    if (DEBUG) {
      console.debug('[LocationValidation] Incoming values');
      console.debug(`  Province      : ${incomingProvince}`);
      console.debug(`  District      : ${incomingDistrict}`);
      console.debug(`  Neighborhood  : ${incomingNeighborhood}`);
    }

    if (!incomingProvince) {
      if (DEBUG) console.debug('[LocationValidation] Province bulundu mu? ✖');
      return false;
    }
    if (DEBUG) console.debug('[LocationValidation] Province bulundu mu? ✔');

    if (!incomingDistrict) {
      if (DEBUG) console.debug('[LocationValidation] District bulundu mu? ✖');
      return false;
    }
    if (DEBUG) console.debug('[LocationValidation] District bulundu mu? ✔');

    if (!incomingNeighborhood) {
      if (DEBUG) console.debug('[LocationValidation] Neighborhood bulundu mu? ✖');
      return false;
    }
    if (DEBUG) console.debug('[LocationValidation] Neighborhood bulundu mu? ✔');

    const neighborhoods = this.getNeighborhoods(incomingProvince, incomingDistrict);
    if (DEBUG) {
      console.debug('[LocationValidation] Province/District lookup result');
      console.debug(`  Matched district count: ${neighborhoods.length}`);
      console.debug(`  Neighborhood list sample: ${neighborhoods.slice(0, 10).join(' | ')}`);
    }

    if (neighborhoods.length === 0) {
      if (DEBUG) console.debug('[LocationValidation] Neighborhood list empty, validation failed.');
      return false;
    }

    const match = this.findMatchingKey(neighborhoods, incomingNeighborhood);
    if (DEBUG) {
      console.debug('[LocationValidation] Match comparison');
      console.debug(`  Expected (normalized): ${normalizeString(incomingNeighborhood)}`);
      console.debug(`  Candidate matches: ${neighborhoods.slice(0, 10).map((item) => `${item} -> ${normalizeString(item)}`).join(' | ')}`);
      console.debug(`  Result: ${match ?? 'no-match'}`);
    }

    return match !== null;
  }

  private findMatchingKey(keys: string[], target: string): string | null {
    const cleanTarget = normalizeString(target);
    for (const key of keys) {
      const cleanKey = normalizeString(key);
      const cleanKeyBase = cleanKey.replace(/\s*\([^)]*\)/g, '').trim();
      if (DEBUG) {
        console.debug(`[LocationValidation] Comparing -> expected: ${cleanTarget} | candidate: ${cleanKey} | normalizedBase: ${cleanKeyBase}`);
      }
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
