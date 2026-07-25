import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { propertyService } from '@/services/property.service';
import { PropertyGallery } from '@/components/properties/PropertyGallery';
import { Calendar, Hash, MapPin, Bed, Bath, Maximize, Ruler, Home, Phone, Share2, Check, ExternalLink } from 'lucide-react';
import { WhatsAppButton } from '@/components/properties/WhatsAppButton';
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
    APARTMENT: 'Daire',
    HOUSE: 'Ev / Müstakil',
    OFFICE: 'Ofis',
    SHOP: 'Dükkan',
    WAREHOUSE: 'Depo',
    LAND: 'Arsa',
    OTHER: 'Diğer',
  };

  const heatingMap: Record<string, string> = {
    NATURAL_GAS: 'Doğalgaz (Kombi)',
    ELECTRIC: 'Elektrikli',
    FLOOR_HEATING: 'Yerden Isıtma',
    COAL: 'Soba / Kömür',
    NONE: 'Yok',
    OTHER: 'Diğer',
  };

  const deedMap: Record<string, string> = {
    FREEHOLD: 'Kat İrtifakı',
    CONDOMINIUM: 'Kat Mülkiyeti',
    FLOOR_EASEMENT: 'Kat İrtifakı',
    SHARED: 'Hisseli Tapu',
    OTHER: 'Diğer',
  };

  const kitchenMap: Record<string, string> = {
    OPEN: 'Açık Mutfak (Amerikan)',
    CLOSED: 'Kapalı Mutfak',
  };

  const wcMap: Record<string, string> = {
    ALAFRANGA: 'Alafranga (Klozet)',
    ALATURKA: 'Alaturka',
    BOTH: 'Her İkisi (Alafranga + Alaturka)',
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
                  <span className="text-lg">
                    {property.neighborhood ? `${property.neighborhood}, ` : ''}
                    {property.district}, {property.city}
                  </span>
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

              {(() => {
                const features: string[] = [];
                if (property.furnished) features.push('Eşyalı');
                if (property.balcony) features.push('Balkon');
                if (property.elevator) features.push('Asansör');
                if (property.parking) features.push('Otopark / Garaj');
                if (property.eligibleForCredit) features.push('Krediye Uygun');
                if (property.exchangeAvailable) features.push('Takas Yapılabilir');
                if (property.kitchenType) features.push(kitchenMap[property.kitchenType] || property.kitchenType);
                if (property.extraRoom) features.push(`Ek Oda (${property.extraRoom})`);
                if (property.wcType) features.push(`WC: ${wcMap[property.wcType] || property.wcType}`);
                if (property.inComplex) features.push(property.complexName ? `Site İçi (${property.complexName})` : 'Site İçerisinde');
                return features.length > 0 ? (
                  <section>
                    <h2 className="text-2xl font-bold text-white mb-4">Özellikler</h2>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {features.map((feature: string, idx: number) => (
                        <li key={idx} className="flex items-center text-[#A1A1AA] bg-[#121212] px-4 py-2 rounded-lg border border-[#333333]">
                          <span className="w-2 h-2 rounded-full bg-brand-400 mr-3" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null;
              })()}

              {property.socialAmenities && property.socialAmenities.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold text-white mb-4">Sosyal Donatılar</h2>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {property.socialAmenities.map((amenity: string, idx: number) => (
                      <li key={idx} className="flex items-center text-[#A1A1AA] bg-[#121212] px-4 py-2 rounded-lg border border-[#333333]">
                        <span className="w-2 h-2 rounded-full bg-blue-500 mr-3" />
                        {amenity}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Konum & Harita Bilgisi */}
              <section className="bg-[#18181B] border border-[#27272A] rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-6 h-6 text-red-500" />
                    <h2 className="text-2xl font-bold text-white">Konum</h2>
                  </div>
                  {property.mapUrl && (
                    <a
                      href={property.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-brand-400 hover:text-brand-300 transition-colors"
                    >
                      <span>Haritada Aç</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                <p className="text-[#A1A1AA] text-base leading-relaxed mb-4">
                  {[property.address, property.neighborhood, property.district, property.city]
                    .filter(Boolean)
                    .join(', ')}
                </p>
                {property.mapUrl && (
                  <a
                    href={property.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 rounded-lg text-sm font-medium transition-colors"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>Google Maps İle Haritada Gör</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-1" />
                  </a>
                )}
              </section>
            </div>

            {/* Right: Summary Card & Action */}
            <div className="space-y-6">
              <div className="bg-[#121212] border border-[#333333] rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-white mb-6 pb-4 border-b border-[#333333]">Özet Bilgiler</h3>
                
                <div className="space-y-4">
                  {property.propertyType !== 'LAND' && (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center text-[#A1A1AA]">
                        <Bed className="w-5 h-5 mr-3" />
                        <span>Oda + Salon</span>
                      </div>
                      <span className="font-medium text-white">
                        {property.roomCount ?? 0} + {property.livingRoomCount ?? 0}
                      </span>
                    </div>
                  )}

                  {property.extraRoom && (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center text-[#A1A1AA]">
                        <span>Ek Oda Bilgisi</span>
                      </div>
                      <span className="font-medium text-white">{property.extraRoom}</span>
                    </div>
                  )}

                  {property.bathroomCount !== null && property.bathroomCount !== undefined && (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center text-[#A1A1AA]">
                        <Bath className="w-5 h-5 mr-3" />
                        <span>Banyo Sayısı</span>
                      </div>
                      <span className="font-medium text-white">{property.bathroomCount}</span>
                    </div>
                  )}

                  {property.wcType && (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center text-[#A1A1AA]">
                        <span>WC Tipi</span>
                      </div>
                      <span className="font-medium text-white">{wcMap[property.wcType] || property.wcType}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-[#A1A1AA]">
                      <Maximize className="w-5 h-5 mr-3" />
                      <span>Brüt / Net Alan</span>
                    </div>
                    <span className="font-medium text-white">
                      {property.grossArea ?? '-'} / {property.netArea ?? '-'} m²
                    </span>
                  </div>

                  {property.floor !== null && property.floor !== undefined && (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center text-[#A1A1AA]">
                        <Home className="w-5 h-5 mr-3" />
                        <span>Bulunduğu Kat</span>
                      </div>
                      <span className="font-medium text-white">
                        {property.floor}. Kat {property.totalFloor ? `(Toplam ${property.totalFloor})` : ''}
                      </span>
                    </div>
                  )}

                  {property.unitsPerFloor !== null && property.unitsPerFloor !== undefined && (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center text-[#A1A1AA]">
                        <span>Kat Başına Daire</span>
                      </div>
                      <span className="font-medium text-white">{property.unitsPerFloor} Daire</span>
                    </div>
                  )}

                  {property.buildingAge !== null && property.buildingAge !== undefined && (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center text-[#A1A1AA]">
                        <Ruler className="w-5 h-5 mr-3" />
                        <span>Bina Yaşı</span>
                      </div>
                      <span className="font-medium text-white">{property.buildingAge} Yıl</span>
                    </div>
                  )}

                  {property.kitchenType && (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center text-[#A1A1AA]">
                        <span>Mutfak Tipi</span>
                      </div>
                      <span className="font-medium text-white">{kitchenMap[property.kitchenType] || property.kitchenType}</span>
                    </div>
                  )}

                  {property.heatingType && (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center text-[#A1A1AA]">
                        <span>Isınma Tipi</span>
                      </div>
                      <span className="font-medium text-white">{heatingMap[property.heatingType] || property.heatingType}</span>
                    </div>
                  )}

                  {property.deedStatus && (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center text-[#A1A1AA]">
                        <span>Tapu Durumu</span>
                      </div>
                      <span className="font-medium text-white">{deedMap[property.deedStatus] || property.deedStatus}</span>
                    </div>
                  )}

                  {property.inComplex && (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center text-[#A1A1AA]">
                        <span>Site Bilgisi</span>
                      </div>
                      <span className="font-medium text-white">{property.complexName ? `Site İçi (${property.complexName})` : 'Site İçerisinde'}</span>
                    </div>
                  )}

                  {property.dues !== null && property.dues !== undefined && property.dues > 0 && (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center text-[#A1A1AA]">
                        <span>Aidat</span>
                      </div>
                      <span className="font-medium text-white">{formatCurrency(property.dues)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-[#A1A1AA]">
                      <Calendar className="w-5 h-5 mr-3" />
                      <span>İlan Tarihi</span>
                    </div>
                    <span className="font-medium text-white">{formattedDate}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-[#A1A1AA]">
                      <Hash className="w-5 h-5 mr-3" />
                      <span>İlan No</span>
                    </div>
                    <span className="font-medium text-white text-sm">{property.id.split('-')[0].toUpperCase()}</span>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-[#333333] space-y-3">
                  {property.mapUrl && (
                    <a
                      href={property.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#27272A] hover:bg-[#3F3F46] text-white font-medium rounded-xl border border-[#3F3F46] transition-colors shadow-sm"
                    >
                      <MapPin className="w-5 h-5 text-red-500" />
                      <span>Google Maps'te Gör</span>
                      <ExternalLink className="w-4 h-4 text-slate-400 ml-auto" />
                    </a>
                  )}
                  <WhatsAppButton />
                </div>
              </div>
            </div>


          </div>
        </div>
      </Container>
    </div>
  );
}
