import { Card, CardContent, CardFooter } from '@/components/ui/Card';

export function SkeletonCard() {
  return (
    <Card className="overflow-hidden bg-[#121212] animate-pulse">
      {/* Image Placeholder */}
      <div className="aspect-[4/3] w-full bg-[#1E1E1E]" />
      
      <CardContent className="p-4">
        {/* Location Placeholder */}
        <div className="mb-3 h-3 w-1/2 rounded bg-[#1E1E1E]" />
        
        {/* Title Placeholder */}
        <div className="mb-2 h-5 w-3/4 rounded bg-[#1E1E1E]" />
        
        {/* Price Placeholder */}
        <div className="mt-4 h-6 w-1/3 rounded bg-[#1E1E1E]" />
      </CardContent>
      
      <CardFooter className="border-t border-slate-100 bg-[#121212] p-4 flex justify-between">
        <div className="h-4 w-1/3 rounded bg-[#1E1E1E]" />
        <div className="h-4 w-1/4 rounded bg-[#1E1E1E]" />
      </CardFooter>
    </Card>
  );
}

