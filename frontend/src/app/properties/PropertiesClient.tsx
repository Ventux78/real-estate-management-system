"use client";

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { propertyService } from '@/services/property.service';
import { PropertiesResponse } from '@/types/property';
import { PropertyCard } from '@/components/properties/PropertyCard';
import { PropertyFilters } from '@/components/properties/PropertyFilters';
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

  const handleFilterChange = (newFilters: any) => {
    updateFiltersAndUrl({ ...filters, ...newFilters, page: 1 });
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

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* Sidebar Filters */}
      <div className="w-full md:w-1/4 flex-shrink-0">
        <PropertyFilters currentFilters={filters} onFilterChange={handleFilterChange} />
      </div>

      {/* Property List */}
      <div className="flex-1">
        {/* Top Bar: Search and Sort */}
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <SearchBar initialSearch={searchTerm} onSearchChange={handleSearchChange} />
          <SortDropdown currentSortBy={sortBy} currentSortOrder={sortOrder} onSortChange={handleSortChange} />
        </div>

        {isError ? (
          <div className="flex h-64 items-center justify-center text-red-600 font-medium bg-[#121212] rounded-xl border border-[#333333]">
            İlanlar yüklenirken bir hata oluştu.
          </div>
        ) : isLoading || isFetching ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col h-64 items-center justify-center text-slate-500 bg-[#121212] rounded-xl border border-[#333333]">
            <p className="text-lg font-medium">İlan bulunamadı</p>
            <p className="text-sm mt-1">Arama kriterlerinizi değiştirerek tekrar deneyin.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
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
        )}
      </div>
    </div>
  );
}

