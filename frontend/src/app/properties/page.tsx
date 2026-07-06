import { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { propertyService } from '@/services/property.service';
import PropertiesClient from './PropertiesClient';

export const metadata: Metadata = {
  title: 'Satılık & Kiralık İlanlar | Gayrimenkul',
  description: 'Türkiye\'nin her yerinden en güncel satılık ve kiralık gayrimenkul ilanları.',
};

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams;
  
  // URL params'dan filtreleri oluştur
  const filters: Record<string, any> = {};
  if (resolvedParams.page) filters.page = Number(resolvedParams.page);
  if (resolvedParams.city) filters.city = resolvedParams.city;
  if (resolvedParams.district) filters.district = resolvedParams.district;
  if (resolvedParams.listingType) filters.listingType = resolvedParams.listingType;
  if (resolvedParams.propertyType) filters.propertyType = resolvedParams.propertyType;
  if (resolvedParams.minimumPrice) filters.minimumPrice = Number(resolvedParams.minimumPrice);
  if (resolvedParams.maximumPrice) filters.maximumPrice = Number(resolvedParams.maximumPrice);
  if (resolvedParams.sortBy) filters.sortBy = resolvedParams.sortBy;
  if (resolvedParams.sortOrder) filters.sortOrder = resolvedParams.sortOrder;
  if (resolvedParams.search) filters.search = resolvedParams.search;

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

