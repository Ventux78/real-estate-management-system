"use client";

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchBarProps {
  initialSearch: string;
  onSearchChange: (search: string) => void;
}

export function SearchBar({ initialSearch, onSearchChange }: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const debouncedSearch = useDebounce(searchTerm, 500);

  // Sync state if initialSearch changes externally (e.g. clear filters)
  useEffect(() => {
    setSearchTerm(initialSearch);
  }, [initialSearch]);

  // Sadece debounced değer değiştiğinde dışarıya haber ver
  useEffect(() => {
    // Avoid triggering on initial render if unchanged
    if (debouncedSearch !== initialSearch) {
      onSearchChange(debouncedSearch);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  return (
    <div className="relative w-full max-w-md">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
      </div>
      <input
        type="text"
        className="block w-full rounded-md border border-[#333333] py-2 pl-10 pr-3 text-sm placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
        placeholder="İlan başlığında ara..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        aria-label="İlanlarda ara"
      />
    </div>
  );
}

