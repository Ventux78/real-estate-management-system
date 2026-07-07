import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import { PropertyCard } from '@/components/properties/PropertyCard';
import { propertyService } from '@/services/property.service';

import { Property } from '@/types/property';

export async function LatestPropertiesSection() {
  let properties: Property[] = [];
  try {
    const response = await propertyService.getProperties({ limit: 4 });
    properties = response.data || [];
  } catch (error) {
    console.error('Failed to fetch latest properties:', error);
    // On error, we just return empty list and handle it gracefully
  }

  return (
    <Section className="bg-[#121212]">
      <Container>
        <div className="mb-12 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Son Yüklenen İlanlar
            </h2>
            <p className="mt-4 text-lg text-[#A1A1AA] max-w-2xl">
              En yeni satılık ve kiralık ilanlarımızı keşfedin.
            </p>
          </div>
          {properties.length > 0 && (
            <Link href="/properties" className="hidden md:inline-flex items-center text-brand-500 hover:text-brand-400 font-medium transition-colors">
              Tüm İlanları Gör <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          )}
        </div>

        {properties.length === 0 ? (
          <div className="rounded-2xl border border-[#333333] bg-[#1E1E1E] p-12 text-center shadow-sm">
            <p className="text-lg font-medium text-[#A1A1AA]">
              Henüz yayınlanmış ilan bulunmuyor.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}

        {properties.length > 0 && (
          <div className="mt-10 text-center md:hidden">
            <Link href="/properties" className="inline-flex h-12 items-center justify-center rounded-md border border-[#333333] bg-transparent px-8 font-medium text-white hover:bg-[#1E1E1E] transition-colors w-full">
              Tüm İlanları Gör
            </Link>
          </div>
        )}
      </Container>
    </Section>
  );
}
