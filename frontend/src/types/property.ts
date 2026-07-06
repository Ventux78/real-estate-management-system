export interface PropertyImage {
  id: string;
  url: string;
  isCover: boolean;
  displayOrder: number;
}

export interface Property {
  id: string;
  slug: string;
  title: string;
  description: string;
  listingType: 'FOR_SALE' | 'FOR_RENT';
  propertyType: 'HOUSE' | 'APARTMENT' | 'OFFICE' | 'LAND' | 'COMMERCIAL';
  price: number;
  city: string;
  district: string;
  address: string;
  features: string[];
  images: PropertyImage[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PropertiesResponse {
  data: Property[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface PropertyFilters {
  page?: number;
  limit?: number;
  city?: string;
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  listingType?: string;
  propertyType?: string;
  isPublished?: boolean;
}
