"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';

const filterSchema = z.object({
  city: z.string().optional(),
  district: z.string().optional(),
  listingType: z.string().optional(),
  propertyType: z.string().optional(),
  minimumPrice: z.string().optional(),
  maximumPrice: z.string().optional(),
});

type FilterValues = z.infer<typeof filterSchema>;

interface PropertyFiltersProps {
  currentFilters: any;
  onFilterChange: (filters: any) => void;
}

export function PropertyFilters({ currentFilters, onFilterChange }: PropertyFiltersProps) {
  const { register, handleSubmit, reset } = useForm<FilterValues>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      city: currentFilters.city || '',
      district: currentFilters.district || '',
      listingType: currentFilters.listingType || '',
      propertyType: currentFilters.propertyType || '',
      minimumPrice: currentFilters.minimumPrice ? String(currentFilters.minimumPrice) : '',
      maximumPrice: currentFilters.maximumPrice ? String(currentFilters.maximumPrice) : '',
    },
  });

  const onSubmit = (data: FilterValues) => {
    // Clean empty values
    const cleaned: Record<string, any> = {};
    Object.entries(data).forEach(([key, value]) => {
      if (value !== '' && value !== undefined && value !== null) {
        cleaned[key] = value;
      }
    });
    onFilterChange(cleaned);
  };

  const clearFilters = () => {
    const emptyState = {
      city: '',
      district: '',
      listingType: '',
      propertyType: '',
      minimumPrice: '',
      maximumPrice: '',
    };
    reset(emptyState);
    onFilterChange(emptyState);
  };

  return (
    <div className="rounded-xl border border-[#333333] bg-[#1E1E1E] p-6 shadow-sm sticky top-24">
      <h3 className="text-lg font-semibold text-white mb-4">Filtreler</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        
        {/* Listing Type */}
        <div>
          <label className="mb-1 block text-sm font-medium text-[#A1A1AA]">İlan Tipi</label>
          <select {...register('listingType')} className="w-full rounded-md border border-[#333333] bg-[#121212] text-white p-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400">
            <option value="">Tümü</option>
            <option value="FOR_SALE">Satılık</option>
            <option value="FOR_RENT">Kiralık</option>
          </select>
        </div>

        {/* Property Type */}
        <div>
          <label className="mb-1 block text-sm font-medium text-[#A1A1AA]">Emlak Tipi</label>
          <select {...register('propertyType')} className="w-full rounded-md border border-[#333333] bg-[#121212] text-white p-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400">
            <option value="">Tümü</option>
            <option value="HOUSE">Ev / Müstakil</option>
            <option value="APARTMENT">Daire</option>
            <option value="OFFICE">Ofis</option>
            <option value="COMMERCIAL">Ticari</option>
            <option value="LAND">Arsa</option>
          </select>
        </div>

        {/* City */}
        <div>
          <label className="mb-1 block text-sm font-medium text-[#A1A1AA]">İl</label>
          <input type="text" {...register('city')} placeholder="Örn. İstanbul" className="w-full rounded-md border border-[#333333] bg-[#121212] text-white p-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400" />
        </div>

        {/* District */}
        <div>
          <label className="mb-1 block text-sm font-medium text-[#A1A1AA]">İlçe</label>
          <input type="text" {...register('district')} placeholder="Örn. Kadıköy" className="w-full rounded-md border border-[#333333] bg-[#121212] text-white p-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400" />
        </div>

        {/* Price Range */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#A1A1AA]">Min Fiyat</label>
            <input type="number" {...register('minimumPrice')} placeholder="0" className="w-full rounded-md border border-[#333333] bg-[#121212] text-white p-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#A1A1AA]">Max Fiyat</label>
            <input type="number" {...register('maximumPrice')} placeholder="Limit yok" className="w-full rounded-md border border-[#333333] bg-[#121212] text-white p-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400" />
          </div>
        </div>

        <div className="pt-4 flex flex-col gap-2">
          <Button type="submit" variant="primary" className="w-full">
            Sonuçları Göster
          </Button>
          <Button type="button" variant="outline" onClick={clearFilters} className="w-full">
            Filtreleri Temizle
          </Button>
        </div>
      </form>
    </div>
  );
}

