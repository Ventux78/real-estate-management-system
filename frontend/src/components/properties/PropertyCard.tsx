import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Maximize, Bed } from 'lucide-react';
import { Property } from '@/types/property';
import { Card, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const coverImage = property.images?.find((img) => img.isCover)?.url || property.images?.[0]?.url || '/placeholder.jpg';
  
  const typeMap: Record<string, string> = {
    HOUSE: 'Ev',
    APARTMENT: 'Daire',
    OFFICE: 'Ofis',
    LAND: 'Arsa',
    COMMERCIAL: 'Ticari',
    OTHER: 'Diğer',
  };

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-md">
      <Link href={`/properties/${property.slug}`} className="block relative aspect-[4/3] overflow-hidden bg-[#121212]">
        <Image
          src={coverImage}
          alt={property.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
        />
        <div className="absolute left-3 top-3 flex flex-col gap-2">
          <Badge variant={property.listingType === 'FOR_SALE' ? 'default' : 'warning'}>
            {property.listingType === 'FOR_SALE' ? 'Satılık' : 'Kiralık'}
          </Badge>
        </div>
      </Link>
      
      <CardContent className="p-4">
        <div className="mb-2 flex items-center text-xs text-[#A1A1AA]">
          <MapPin className="mr-1 h-3 w-3" />
          {property.district}, {property.city}
        </div>
        
        <Link href={`/properties/${property.slug}`}>
          <h3 className="line-clamp-1 text-lg font-semibold text-white group-hover:text-brand-500">
            {property.title}
          </h3>
        </Link>
        
        <div className="mt-2 text-xl font-bold text-brand-500">
          {formatCurrency(property.price)}
        </div>
      </CardContent>
      
      <CardFooter className="border-t border-[#333333] bg-[#1E1E1E] p-4 text-sm text-[#A1A1AA] flex justify-between">
        <div className="flex items-center space-x-4">
          {property.propertyType !== 'LAND' && (
            <div className="flex items-center" title="Oda + Salon">
              <Bed className="mr-1.5 h-4 w-4 text-[#A1A1AA]" />
              <span>
                {/* Fallbacks if these fields are missing on backend types */}
                {(property as any).roomCount ?? 0} + {(property as any).livingRoomCount ?? 0}
              </span>
            </div>
          )}
          <div className="flex items-center" title="Brüt Alan">
            <Maximize className="mr-1.5 h-4 w-4 text-[#A1A1AA]" />
            <span>{(property as any).grossArea ?? 0} m²</span>
          </div>
        </div>
        <div className="font-medium text-[#A1A1AA]">
          {typeMap[property.propertyType] || property.propertyType}
        </div>
      </CardFooter>
    </Card>
  );
}

