import { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { propertyService } from '@/services/property.service';
import PropertiesClient from './PropertiesClient';
import type { PropertyFilters, ListingType, PropertyType } from '@/types/property';

export const metadata: Metadata = {
  title: 'Satılık & Kiralık İlanlar | Gayrimenkul',
  description: 'Türkiye\'nin her yerinden en güncel satılık ve kiralık gayrimenkul ilanları.',
};

const VALID_LISTING_TYPES: ListingType[] = ['FOR_SALE', 'FOR_RENT'];
const VALID_PROPERTY_TYPES: PropertyType[] = ['APARTMENT', 'HOUSE', 'LAND', 'OFFICE', 'SHOP', 'WAREHOUSE', 'OTHER'];
const VALID_SORT_BY = ['price', 'createdAt', 'updatedAt', 'title'] as const;
const VALID_SORT_ORDER = ['asc', 'desc'] as const;

function parseStringParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return undefined;
}

function parseNumberParam(value: string | string[] | undefined): number | undefined {
  if (typeof value !== 'string') return undefined;
  const num = Number(value);
  return !isNaN(num) && num > 0 ? num : undefined;
}

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams;
  
  // URL params'dan filtreleri oluştur — invalid değerler varsayılana döner
  const filters: PropertyFilters = {};

  const page = parseNumberParam(resolvedParams.page);
  if (page) filters.page = Math.floor(page);

  const city = parseStringParam(resolvedParams.city);
  if (city) filters.city = city;

  const district = parseStringParam(resolvedParams.district);
  if (district) filters.district = district;

  const listingType = parseStringParam(resolvedParams.listingType);
  if (listingType && VALID_LISTING_TYPES.includes(listingType as ListingType)) {
    filters.listingType = listingType as ListingType;
  }

  const propertyType = parseStringParam(resolvedParams.propertyType);
  if (propertyType && VALID_PROPERTY_TYPES.includes(propertyType as PropertyType)) {
    filters.propertyType = propertyType as PropertyType;
  }

  const minimumPrice = parseNumberParam(resolvedParams.minimumPrice);
  if (minimumPrice) filters.minimumPrice = minimumPrice;

  const maximumPrice = parseNumberParam(resolvedParams.maximumPrice);
  if (maximumPrice) filters.maximumPrice = maximumPrice;

  const sortBy = parseStringParam(resolvedParams.sortBy);
  if (sortBy && (VALID_SORT_BY as readonly string[]).includes(sortBy)) {
    filters.sortBy = sortBy as PropertyFilters['sortBy'];
  }

  const sortOrder = parseStringParam(resolvedParams.sortOrder);
  if (sortOrder && (VALID_SORT_ORDER as readonly string[]).includes(sortOrder)) {
    filters.sortOrder = sortOrder as PropertyFilters['sortOrder'];
  }

  const search = parseStringParam(resolvedParams.search);
  if (search) filters.search = search;

  // Initial Data Fetch
  const initialData = await propertyService.getProperties(filters).catch(() => ({
    data: [],
    meta: { total: 0, page: 1, limit: 10, totalPages: 0 }
  }));

  return (
    <div className="bg-[#121212] py-12 min-h-screen">
      <Container>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Gayrimenkul İlanları</h1>
          <p className="mt-2 text-[#A1A1AA]">Hayalinizdeki gayrimenkulü bulun</p>
        </div>
        
        {/* Client Component: TanStack Query + Filters */}
        <PropertiesClient initialFilters={filters} initialData={initialData} />
      </Container>
    </div>
  );
}
