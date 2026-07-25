export interface PropertyImage {
  id: string;
  imageUrl: string;
  isCover: boolean;
  displayOrder: number;
}

export type ListingType = 'FOR_SALE' | 'FOR_RENT';

export type PropertyType =
  | 'APARTMENT'
  | 'HOUSE'
  | 'LAND'
  | 'OFFICE'
  | 'SHOP'
  | 'WAREHOUSE'
  | 'OTHER';

export interface Property {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  listingType: ListingType;
  propertyType: PropertyType;
  price: number;
  city: string;
  district: string;
  address: string;
  neighborhood: string | null;
  grossArea: number | null;
  netArea: number | null;
  roomCount: number | null;
  livingRoomCount: number | null;
  bathroomCount: number | null;
  floor: number | null;
  totalFloor: number | null;
  buildingAge: number | null;
  heatingType: string | null;
  dues: number | null;
  deedStatus: string | null;
  furnished: boolean;
  balcony: boolean;
  elevator: boolean;
  parking: boolean;
  eligibleForCredit?: boolean;
  exchangeAvailable?: boolean;
  kitchenType?: 'OPEN' | 'CLOSED' | null;
  extraRoom?: string | null;
  unitsPerFloor?: number | null;
  wcType?: 'ALAFRANGA' | 'ALATURKA' | 'BOTH' | null;
  inComplex?: boolean;
  complexName?: string | null;
  mapUrl?: string | null;
  isMapUrlManual?: boolean;
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
  minimumPrice?: number;
  maximumPrice?: number;
  listingType?: ListingType;
  propertyType?: PropertyType;
  sortBy?: 'price' | 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
  search?: string;
}
