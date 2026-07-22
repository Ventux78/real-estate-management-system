import { api } from './api';
import { Property, PropertiesResponse, PropertyFilters } from '@/types/property';
import { withRetry } from '@/lib/retryFetch';

// Axios interceptor strips the AxiosResponse wrapper and returns response.data directly.
// The backend wraps responses in { success: true, data: ... }, so we get that object.
interface BackendResponse {
  success: boolean;
  data: unknown;
}

interface BackendPaginatedData {
  data: Property[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export const propertyService = {
  getProperties: async (filters: PropertyFilters = {}): Promise<PropertiesResponse> => {
    // Build query params — exclude client-only 'search' field
    const params = new URLSearchParams();

    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.city) params.set('city', filters.city.trim());
    if (filters.district) params.set('district', filters.district.trim());
    if (filters.listingType) params.set('listingType', filters.listingType);
    if (filters.propertyType) params.set('propertyType', filters.propertyType);
    if (filters.minimumPrice) params.set('minimumPrice', String(filters.minimumPrice));
    if (filters.maximumPrice) params.set('maximumPrice', String(filters.maximumPrice));
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);

    // Always show only published properties on frontend
    params.set('isPublished', 'true');

    // withRetry: up to 3 attempts, 2 s apart, only for 5xx / network errors
    const response = await withRetry(() => api.get(`/properties?${params.toString()}`));

    // Axios interceptor returns response.data, which is the backend envelope
    const envelope = response as unknown as BackendResponse;
    const payload = envelope.success
      ? (envelope.data as BackendPaginatedData)
      : (response as unknown as BackendPaginatedData);

    return {
      data: payload.data || [],
      meta: payload.pagination
        ? {
            total: payload.pagination.total,
            page: payload.pagination.page,
            limit: payload.pagination.limit,
            totalPages: payload.pagination.pages,
          }
        : { total: 0, page: 1, limit: 10, totalPages: 0 },
    };
  },

  getPropertyBySlug: async (slug: string): Promise<Property> => {
    // Backend'de /slug/:slug endpoint'i olmadığı ve yeni endpoint eklememiz
    // istenmediği için, listeyi çekip içinden buluyoruz. (Geçici çözüm)
    const listResponse = await api.get('/properties?limit=100');
    const listEnvelope = listResponse as unknown as BackendResponse;
    const listPayload = listEnvelope.success
      ? (listEnvelope.data as BackendPaginatedData)
      : (listResponse as unknown as BackendPaginatedData);
    const properties = listPayload.data;
    const property = properties.find((p) => p.slug === slug);
    
    if (!property) {
      throw new Error('Property not found');
    }
    
    // Gerekirse property ID'si ile detayları tekrar çekebiliriz, ama liste
    // zaten tüm alanları (images dahil) dönüyorsa direkt kullanabiliriz.
    const detailResponse = await api.get(`/properties/${property.id}`);
    const detailEnvelope = detailResponse as unknown as BackendResponse;
    return (detailEnvelope.success ? detailEnvelope.data : detailResponse) as Property;
  },
};
