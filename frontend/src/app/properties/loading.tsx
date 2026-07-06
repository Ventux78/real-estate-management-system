import { Container } from '@/components/ui/Container';
import { SkeletonCard } from '@/components/properties/SkeletonCard';

export default function Loading() {
  return (
    <div className="bg-[#121212] py-12 min-h-screen">
      <Container>
        <div className="mb-8">
          <div className="h-9 w-64 rounded bg-[#1E1E1E] mb-2" />
          <div className="h-5 w-48 rounded bg-[#1E1E1E]" />
        </div>
        
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Skeleton */}
          <div className="w-full md:w-1/4 flex-shrink-0">
            <div className="h-96 w-full rounded-xl bg-[#1E1E1E] animate-pulse" />
          </div>

          {/* List Skeleton */}
          <div className="flex-1">
            <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="h-10 w-full sm:w-64 rounded-md bg-[#1E1E1E] animate-pulse" />
              <div className="h-10 w-full sm:w-48 rounded-md bg-[#1E1E1E] animate-pulse" />
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

