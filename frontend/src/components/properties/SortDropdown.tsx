"use client";

interface SortOption {
  label: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const sortOptions: SortOption[] = [
  { label: 'En Yeni', sortBy: 'createdAt', sortOrder: 'desc' },
  { label: 'En Eski', sortBy: 'createdAt', sortOrder: 'asc' },
  { label: 'Fiyat (Artan)', sortBy: 'price', sortOrder: 'asc' },
  { label: 'Fiyat (Azalan)', sortBy: 'price', sortOrder: 'desc' },
];

interface SortDropdownProps {
  currentSortBy: string;
  currentSortOrder: string;
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
}

export function SortDropdown({ currentSortBy, currentSortOrder, onSortChange }: SortDropdownProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [sortBy, sortOrder] = e.target.value.split('|');
    onSortChange(sortBy, sortOrder as 'asc' | 'desc');
  };

  const currentValue = currentSortBy && currentSortOrder ? `${currentSortBy}|${currentSortOrder}` : 'createdAt|desc';

  return (
    <div className="flex items-center space-x-2">
      <label htmlFor="sort" className="text-sm font-medium text-[#A1A1AA] whitespace-nowrap">
        Sırala:
      </label>
      <select
        id="sort"
        value={currentValue}
        onChange={handleChange}
        className="block w-full rounded-md border border-[#333333] py-1.5 pl-3 pr-8 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
        aria-label="İlanları sırala"
      >
        {sortOptions.map((opt) => (
          <option key={`${opt.sortBy}|${opt.sortOrder}`} value={`${opt.sortBy}|${opt.sortOrder}`}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

