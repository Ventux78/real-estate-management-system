"use client";

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { propertyService } from '@/services/property.service';
import { PropertiesResponse } from '@/types/property';
import { PropertyCard } from '@/components/properties/PropertyCard';
import { SkeletonCard } from '@/components/properties/SkeletonCard';
import { SearchBar } from '@/components/properties/SearchBar';
import { SortDropdown } from '@/components/properties/SortDropdown';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function PropertiesClient({
  initialFilters,
  initialData,
}: {
  initialFilters: any;
  initialData: PropertiesResponse;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState(initialFilters);

  // Extract sorting parameters and search term for client-side filtering
  const sortBy = filters.sortBy || 'createdAt';
  const sortOrder = filters.sortOrder || 'desc';
  const searchTerm = filters.search || '';

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['properties', filters],
    queryFn: () => propertyService.getProperties(filters),
    initialData: initialData,
    staleTime: 60000,
  });

  const updateFiltersAndUrl = (newFilters: any) => {
    setFilters(newFilters);
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, String(v));
    });
    router.push(`/properties?${params.toString()}`);
  };


  const handlePageChange = (newPage: number) => {
    updateFiltersAndUrl({ ...filters, page: newPage });
  };

  const handleSearchChange = (search: string) => {
    updateFiltersAndUrl({ ...filters, search, page: 1 });
  };

  const handleSortChange = (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    updateFiltersAndUrl({ ...filters, sortBy: newSortBy, sortOrder: newSortOrder, page: 1 });
  };

  // Client-side filtering for search term
  const filteredData = useMemo(() => {
    if (!data?.data) return [];
    if (!searchTerm) return data.data;
    const lowerSearch = searchTerm.toLowerCase();
    return data.data.filter((property) => property.title.toLowerCase().includes(lowerSearch));
  }, [data, searchTerm]);

  /**
   * Render the property grid area.
   *
   * - isLoading  → skeleton (also covers background retry attempts: retries
   *   run inside getProperties before React Query ever sees an error, so the
   *   loading state persists transparently throughout all retry attempts).
   * - isError    → user-friendly failure message after all retries exhausted.
   * - isFetching → keep existing cards visible (filter/page change in-flight).
   * - otherwise  → real data or empty state.
   */
  const renderContent = () => {
    if (isLoading) {
      return (
        <div>
          {/* Loading header — prevents layout shift by keeping the same grid height */}
          <div className="mb-6 flex flex-col items-center justify-center gap-2 py-4">
            <p className="text-base font-semibold text-white animate-pulse">
              İlanlar yükleniyor...
            </p>
            <p className="text-sm text-[#A1A1AA]">
              İlk yükleme birkaç saniye sürebilir.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      );
    }

    if (isError) {
      return (
        <div className="flex h-64 items-center justify-center rounded-xl border border-[#333333] bg-[#121212]">
          <div className="text-center px-4">
            <p className="text-base font-semibold text-red-400">
              İlanlar şu anda yüklenemedi.
            </p>
            <p className="mt-1 text-sm text-[#A1A1AA]">
              Lütfen birkaç saniye sonra tekrar deneyin.
            </p>
          </div>
        </div>
      );
    }

    if (filteredData.length === 0) {
      return (
        <div className="flex flex-col h-64 items-center justify-center text-slate-500 bg-[#121212] rounded-xl border border-[#333333]">
          <p className="text-lg font-medium">İlan bulunamadı</p>
          <p className="text-sm mt-1">Arama kriterlerinizi değiştirerek tekrar deneyin.</p>
        </div>
      );
    }

    return (
      <>
        {/* Slight opacity during filter/page refetch — keeps cards visible */}
        <div
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3"
          style={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity 0.2s ease' }}
        >
          {filteredData.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>

        {/* Pagination */}
        {data.meta && data.meta.totalPages > 1 && (
          <div className="mt-12 flex justify-center items-center space-x-4">
            <Button
              variant="outline"
              disabled={data.meta.page <= 1}
              onClick={() => handlePageChange(data.meta.page - 1)}
            >
              <ChevronLeft className="mr-2 h-4 w-4" /> Önceki
            </Button>
            <span className="text-sm font-medium text-[#A1A1AA]">
              Sayfa {data.meta.page} / {data.meta.totalPages}
            </span>
            <Button
              variant="outline"
              disabled={data.meta.page >= data.meta.totalPages}
              onClick={() => handlePageChange(data.meta.page + 1)}
            >
              Sonraki <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </>
    );
  };

  return (
    <div>
      {/* Top Bar: Search and Sort */}
      <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <SearchBar initialSearch={searchTerm} onSearchChange={handleSearchChange} />
        <SortDropdown currentSortBy={sortBy} currentSortOrder={sortOrder} onSortChange={handleSortChange} />
      </div>

      {renderContent()}
    </div>
  );
}

