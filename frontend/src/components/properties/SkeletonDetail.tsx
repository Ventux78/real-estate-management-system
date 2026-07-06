export function SkeletonDetail() {
  return (
    <div className="bg-[#121212] rounded-2xl shadow-sm border border-[#333333] overflow-hidden animate-pulse">
      
      {/* Header Section Skeleton */}
      <div className="p-6 md:p-8 border-b border-[#333333] flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        <div className="w-full md:w-2/3">
          <div className="mb-3 h-6 w-32 rounded-full bg-[#1E1E1E]" />
          <div className="mb-4 h-10 w-3/4 rounded bg-[#1E1E1E]" />
          <div className="h-6 w-1/2 rounded bg-[#1E1E1E]" />
        </div>
        <div className="md:text-right">
          <div className="h-10 w-32 rounded bg-[#1E1E1E] mb-2" />
        </div>
      </div>

      {/* Gallery Section Skeleton */}
      <div className="p-6 md:p-8 border-b border-[#333333] bg-[#121212]/50">
        <div className="aspect-[16/9] w-full rounded-xl bg-[#1E1E1E]" />
        <div className="mt-4 flex gap-4 overflow-hidden">
          <div className="h-20 w-32 flex-shrink-0 rounded-lg bg-[#1E1E1E]" />
          <div className="h-20 w-32 flex-shrink-0 rounded-lg bg-[#1E1E1E]" />
          <div className="h-20 w-32 flex-shrink-0 rounded-lg bg-[#1E1E1E]" />
          <div className="h-20 w-32 flex-shrink-0 rounded-lg bg-[#1E1E1E] hidden sm:block" />
        </div>
      </div>

      {/* Content Section Skeleton */}
      <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-10">
          <div className="space-y-4">
            <div className="h-8 w-1/3 rounded bg-[#1E1E1E]" />
            <div className="h-4 w-full rounded bg-[#1E1E1E]" />
            <div className="h-4 w-full rounded bg-[#1E1E1E]" />
            <div className="h-4 w-5/6 rounded bg-[#1E1E1E]" />
            <div className="h-4 w-4/6 rounded bg-[#1E1E1E]" />
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="bg-[#121212] border border-[#333333] rounded-xl p-6">
            <div className="h-6 w-1/2 rounded bg-[#1E1E1E] mb-6 pb-4 border-b border-slate-100" />
            <div className="space-y-6">
              <div className="h-4 w-full rounded bg-[#1E1E1E]" />
              <div className="h-4 w-full rounded bg-[#1E1E1E]" />
              <div className="h-4 w-full rounded bg-[#1E1E1E]" />
            </div>
            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="h-14 w-full rounded-md bg-[#1E1E1E]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

