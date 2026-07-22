"use client";

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { propertyService } from '@/services/property.service';
import { PropertiesResponse, PropertyFilters as PropertyFiltersType } from '@/types/property';
import { PropertyCard } from '@/components/properties/PropertyCard';
import { SkeletonCard } from '@/components/properties/SkeletonCard';
import { PropertyFilters } from '@/components/properties/PropertyFilters';
import { SearchBar } from '@/components/properties/SearchBar';
import { SortDropdown } from '@/components/properties/SortDropdown';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PropertiesClientProps {
  initialFilters: PropertyFiltersType;
  initialData: PropertiesResponse;
}

function parseUrlFilters(): PropertyFiltersType {
  if (typeof window === 'undefined') return {};
  const searchParams = new URLSearchParams(window.location.search);
  const urlFilters: PropertyFiltersType = {};

  const page = searchParams.get('page');
  if (page && !isNaN(Number(page))) urlFilters.page = Number(page);

  const city = searchParams.get('city');
  if (city) urlFilters.city = city.trim();

  const district = searchParams.get('district');
  if (district) urlFilters.district = district.trim();

  const listingType = searchParams.get('listingType');
  if (listingType) urlFilters.listingType = listingType as PropertyFiltersType['listingType'];

  const propertyType = searchParams.get('propertyType');
  if (propertyType) urlFilters.propertyType = propertyType as PropertyFiltersType['propertyType'];

  const minimumPrice = searchParams.get('minimumPrice');
  if (minimumPrice && !isNaN(Number(minimumPrice))) urlFilters.minimumPrice = Number(minimumPrice);

  const maximumPrice = searchParams.get('maximumPrice');
  if (maximumPrice && !isNaN(Number(maximumPrice))) urlFilters.maximumPrice = Number(maximumPrice);

  const sortBy = searchParams.get('sortBy');
  if (sortBy) urlFilters.sortBy = sortBy as PropertyFiltersType['sortBy'];

  const sortOrder = searchParams.get('sortOrder');
  if (sortOrder) urlFilters.sortOrder = sortOrder as PropertyFiltersType['sortOrder'];

  const search = searchParams.get('search');
  if (search) urlFilters.search = search.trim();

  return urlFilters;
}

export default function PropertiesClient({
  initialFilters,
  initialData,
}: PropertiesClientProps) {
  const [filters, setFilters] = useState<PropertyFiltersType>(initialFilters);

  // Extract sorting parameters and search term for client-side filtering
  const sortBy = filters.sortBy || 'createdAt';
  const sortOrder = filters.sortOrder || 'desc';
  const searchTerm = filters.search || '';

  // ── URL Sync ──────────────────────────────────────────────────────────────
  const syncToUrl = useCallback((newFilters: PropertyFiltersType) => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    const entries = Object.entries(newFilters) as [keyof PropertyFiltersType, PropertyFiltersType[keyof PropertyFiltersType]][];
    entries.forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 0) {
        params.set(key, String(value));
      }
    });
    const queryString = params.toString();
    const newPath = queryString ? `/properties?${queryString}` : '/properties';
    window.history.pushState(null, '', newPath);
  }, []);

  // Listen to popstate (browser back/forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      setFilters(parseUrlFilters());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // ── Filter Updates ────────────────────────────────────────────────────────
  const updateFilters = useCallback((updater: (prev: PropertyFiltersType) => PropertyFiltersType) => {
    setFilters((prev) => {
      const nextFilters = updater(prev);
      syncToUrl(nextFilters);
      return nextFilters;
    });
  }, [syncToUrl]);

  const handleFilterChange = useCallback((filterValues: Partial<PropertyFiltersType>) => {
    updateFilters((prev) => {
      const nextFilters: PropertyFiltersType = {
        city: filterValues.city,
        district: filterValues.district,
        listingType: filterValues.listingType,
        propertyType: filterValues.propertyType,
        minimumPrice: filterValues.minimumPrice,
        maximumPrice: filterValues.maximumPrice,
        sortBy: prev.sortBy,
        sortOrder: prev.sortOrder,
        search: prev.search,
        page: 1,
      };

      // Clean up undefined / empty values
      (Object.keys(nextFilters) as (keyof PropertyFiltersType)[]).forEach((key) => {
        if (nextFilters[key] === undefined || nextFilters[key] === '') {
          delete nextFilters[key];
        }
      });

      return nextFilters;
    });
  }, [updateFilters]);

  const handlePageChange = useCallback((newPage: number) => {
    updateFilters((prev) => ({ ...prev, page: newPage }));
  }, [updateFilters]);

  const handleSearchChange = useCallback((search: string) => {
    updateFilters((prev) => {
      const nextFilters = { ...prev, search: search || undefined, page: 1 };
      if (!search) delete nextFilters.search;
      return nextFilters;
    });
  }, [updateFilters]);

  const handleSortChange = useCallback((newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    updateFilters((prev) => ({
      ...prev,
      sortBy: newSortBy as PropertyFiltersType['sortBy'],
      sortOrder: newSortOrder,
      page: 1,
    }));
  }, [updateFilters]);

  // ── Check if current filters match initialFilters (initial SSR load) ───────
  const isInitialFilters = useMemo(() => {
    return JSON.stringify(filters) === JSON.stringify(initialFilters);
  }, [filters, initialFilters]);

  // ── Data Fetching ─────────────────────────────────────────────────────────
  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['properties', filters],
    queryFn: () => propertyService.getProperties(filters),
    initialData: isInitialFilters ? initialData : undefined,
    staleTime: 60000,
  });

  // ── Client-side Search Filter ─────────────────────────────────────────────
  const filteredData = useMemo(() => {
    const propertiesList = data?.data || [];
    if (!searchTerm) return propertiesList;
    const lowerSearch = searchTerm.toLowerCase();
    return propertiesList.filter((property) => property.title.toLowerCase().includes(lowerSearch));
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
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
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
          <p className="text-lg font-medium">Sonuç bulunamadı</p>
          <p className="text-sm mt-1">Arama kriterlerinizi değiştirerek tekrar deneyin.</p>
        </div>
      );
    }

    const meta = data?.meta;

    return (
      <>
        {/* Slight opacity during filter/page refetch — keeps cards visible */}
        <div
          className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
          style={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity 0.2s ease' }}
        >
          {filteredData.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="mt-12 flex justify-center items-center space-x-4">
            <Button
              variant="outline"
              disabled={meta.page <= 1}
              onClick={() => handlePageChange(meta.page - 1)}
            >
              <ChevronLeft className="mr-2 h-4 w-4" /> Önceki
            </Button>
            <span className="text-sm font-medium text-[#A1A1AA]">
              Sayfa {meta.page} / {meta.totalPages}
            </span>
            <Button
              variant="outline"
              disabled={meta.page >= meta.totalPages}
              onClick={() => handlePageChange(meta.page + 1)}
            >
              Sonraki <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar Filters */}
      <aside className="w-full lg:w-72 flex-shrink-0">
        <PropertyFilters currentFilters={filters} onFilterChange={handleFilterChange} />
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Top Bar: Search and Sort */}
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <SearchBar initialSearch={searchTerm} onSearchChange={handleSearchChange} />
          <SortDropdown currentSortBy={sortBy} currentSortOrder={sortOrder} onSortChange={handleSortChange} />
        </div>

        {renderContent()}
      </div>
    </div>
  );
}
