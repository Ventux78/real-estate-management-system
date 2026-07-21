import { api } from './api';
import { Property, PropertiesResponse, PropertyFilters } from '@/types/property';
import { withRetry } from '@/lib/retryFetch';

export const propertyService = {
  getProperties: async (filters: PropertyFilters = {}): Promise<PropertiesResponse> => {
    // Only published properties should be visible to public users
    const apiFilters = { ...filters };
    if ('search' in apiFilters) delete apiFilters.search;

    const query = new URLSearchParams({ ...apiFilters, isPublished: 'true' } as any);

    // withRetry: up to 3 attempts, 2 s apart, only for 5xx / network errors
    const response = await withRetry(() => api.get(`/properties?${query.toString()}`));

    // Handle { success: true, data: { data: [], pagination: {} } } wrapper from backend
    const payload = (response as any).success ? (response as any).data : response;

    return {
      data: payload.data || [],
      meta: payload.pagination || payload.meta || { total: 0, page: 1, limit: 10, totalPages: 1 }
    };
  },

  getPropertyBySlug: async (slug: string): Promise<Property> => {
    // Backend'de /slug/:slug endpoint'i olmadığı ve yeni endpoint eklememiz
    // istenmediği için, listeyi çekip içinden buluyoruz. (Geçici çözüm)
    const response = await api.get('/properties?limit=100');
    const payload = (response as any).success ? (response as any).data : response;
    const properties = payload.data as Property[];
    const property = properties.find((p) => p.slug === slug);
    
    if (!property) {
      throw new Error('Property not found');
    }
    
    // Gerekirse property ID'si ile detayları tekrar çekebiliriz, ama liste
    // zaten tüm alanları (images dahil) dönüyorsa direkt kullanabiliriz.
    const detailResponse = await api.get(`/properties/${property.id}`);
    return ((detailResponse as any).success ? (detailResponse as any).data : detailResponse) as Property;
  },
};
