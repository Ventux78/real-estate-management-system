import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { propertyService } from '@/services/property.service';
import { PropertyGallery } from '@/components/properties/PropertyGallery';
import { MapPin, Bed, Maximize, Calendar, Hash, Phone } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

// Dynamic metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const resolvedParams = await params;
  try {
    const property = await propertyService.getPropertyBySlug(resolvedParams.slug);
    
    return {
      title: `${property.title} | Gayrimenkul`,
      description: property.description?.substring(0, 160) || property.title,
      openGraph: {
        title: property.title,
        description: property.description?.substring(0, 160) || property.title,
        images: property.images.length > 0 ? [property.images.find(i => i.isCover)?.imageUrl || property.images[0].imageUrl] : [],
      },
    };
  } catch (error) {
    return {
      title: 'İlan Bulunamadı | Gayrimenkul',
    };
  }
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const resolvedParams = await params;
  let property;
  try {
    property = await propertyService.getPropertyBySlug(resolvedParams.slug);
  } catch (error) {
    notFound();
  }

  const typeMap: Record<string, string> = {
    HOUSE: 'Ev / Müstakil',
    APARTMENT: 'Daire',
    OFFICE: 'Ofis',
    LAND: 'Arsa',
    COMMERCIAL: 'Ticari',
    OTHER: 'Diğer',
  };

  const formattedDate = new Date(property.createdAt).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="bg-[#121212] py-12 min-h-screen">
      <Container>
        <div className="bg-[#121212] rounded-2xl shadow-sm border border-[#333333] overflow-hidden">
          
          {/* Header Section */}
          <div className="p-6 md:p-8 border-b border-[#333333]">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div>
                <div className="flex items-center space-x-2 text-sm text-slate-500 mb-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium bg-brand-100 text-brand-700">
                    {property.listingType === 'FOR_SALE' ? 'Satılık' : 'Kiralık'}
                  </span>
                  <span>•</span>
                  <span>{typeMap[property.propertyType] || property.propertyType}</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{property.title}</h1>
                <div className="flex items-center text-[#A1A1AA]">
                  <MapPin className="h-5 w-5 mr-2 text-slate-400" />
                  <span className="text-lg">{property.district}, {property.city}</span>
                </div>
              </div>
              <div className="md:text-right">
                <div className="text-4xl font-extrabold text-brand-500 mb-2">
                  {formatCurrency(property.price)}
                </div>
              </div>
            </div>
          </div>

          {/* Gallery Section */}
          <div className="p-6 md:p-8 border-b border-[#333333] bg-[#121212]/50">
            <PropertyGallery images={property.images} title={property.title} />
          </div>

          {/* Content Section */}
          <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-12">
            
            {/* Left: Description & Features */}
            <div className="lg:col-span-2 space-y-10">
              
              <section>
                <h2 className="text-2xl font-bold text-white mb-4">İlan Açıklaması</h2>
                <div className="prose prose-slate max-w-none text-[#A1A1AA] whitespace-pre-wrap">
                  {property.description || 'Açıklama belirtilmemiş.'}
                </div>
              </section>

              {property.features && property.features.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold text-white mb-4">Özellikler</h2>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {property.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center text-[#A1A1AA] bg-[#121212] px-4 py-2 rounded-lg border border-slate-100">
                        <span className="w-2 h-2 rounded-full bg-brand-400 mr-3" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            {/* Right: Summary Card & Action */}
            <div className="space-y-6">
              <div className="bg-[#121212] border border-[#333333] rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-white mb-6 pb-4 border-b border-slate-100">Özet Bilgiler</h3>
                
                <div className="space-y-4">
                  {property.propertyType !== 'LAND' && (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center text-slate-500">
                        <Bed className="w-5 h-5 mr-3" />
                        <span>Oda + Salon</span>
                      </div>
                      <span className="font-medium text-white">
                        {(property as any).roomCount ?? 0} + {(property as any).livingRoomCount ?? 0}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-slate-500">
                      <Maximize className="w-5 h-5 mr-3" />
                      <span>Brüt / Net Alan</span>
                    </div>
                    <span className="font-medium text-white">
                      {(property as any).grossArea ?? '-'} / {(property as any).netArea ?? '-'} m²
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-slate-500">
                      <Calendar className="w-5 h-5 mr-3" />
                      <span>İlan Tarihi</span>
                    </div>
                    <span className="font-medium text-white">{formattedDate}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-slate-500">
                      <Hash className="w-5 h-5 mr-3" />
                      <span>İlan No</span>
                    </div>
                    <span className="font-medium text-white text-sm">{property.id.split('-')[0].toUpperCase()}</span>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <Button size="lg" className="w-full h-14 text-lg">
                    <Phone className="w-5 h-5 mr-2" />
                    İletişime Geç
                  </Button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </Container>
    </div>
  );
}
