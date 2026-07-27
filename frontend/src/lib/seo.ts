import type { Metadata } from 'next';
import { Property } from '@/types/property';

export const DEFAULT_SITE_NAME = 'Baştuğ Gayrimenkul';
export const DEFAULT_SITE_DESCRIPTION =
  "Türkiye'nin en yenilikçi ve güvenilir gayrimenkul ilan platformu. Satılık, kiralık evler, arsalar ve ofisler.";
export const DEFAULT_SITE_KEYWORDS = [
  'gayrimenkul',
  'satılık daire',
  'kiralık ev',
  'emlak ilanları',
  'baştuğ gayrimenkul',
  'arsa',
  'işyeri',
  'adana satılık daire',
  'çukurova kiralık ev',
];
export const DEFAULT_OG_IMAGE = '/hero-section.png';

/**
 * Validates and gets the base URL for the site.
 * In production mode, throws an error if NEXT_PUBLIC_SITE_URL is not configured.
 * In development, falls back to http://localhost:3000.
 */
export function getBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (envUrl && envUrl.trim() !== '') {
    return envUrl.replace(/\/+$/, '');
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'CRITICAL: NEXT_PUBLIC_SITE_URL environment variable is not defined in production environment!'
    );
  }

  return 'http://localhost:3000';
}

/**
 * Returns absolute canonical URL for a given relative path.
 */
export function getCanonicalUrl(path: string = ''): string {
  const baseUrl = getBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath === '/' ? '' : cleanPath}`;
}

const PROPERTY_TYPE_MAP: Record<string, { label: string; lower: string }> = {
  APARTMENT: { label: 'Daire', lower: 'daire' },
  HOUSE: { label: 'Ev / Müstakil', lower: 'müstakil ev' },
  OFFICE: { label: 'Ofis', lower: 'ofis' },
  SHOP: { label: 'Dükkan', lower: 'dükkan' },
  WAREHOUSE: { label: 'Depo', lower: 'depo' },
  LAND: { label: 'Arsa', lower: 'arsa' },
  OTHER: { label: 'Gayrimenkul', lower: 'gayrimenkul' },
};

/**
 * Generates automated descriptive alt text for property images.
 * E.g. "Adana Çukurova'da satılık 3+1 Daire - Görsel 1 / 5"
 */
export function generatePropertyImageAlt(
  property: Partial<Property>,
  index: number = 0,
  totalCount: number = 1
): string {
  const city = property.city || 'Adana';
  const district = property.district ? `${property.district}` : '';
  const location = district ? `${city} ${district}'da` : `${city}'de`;
  const typeObj = PROPERTY_TYPE_MAP[property.propertyType || 'OTHER'] || { label: 'Gayrimenkul' };
  const listingTypeStr = property.listingType === 'FOR_SALE' ? 'satılık' : 'kiralık';

  let roomStr = '';
  if (property.propertyType !== 'LAND' && property.roomCount !== undefined && property.roomCount !== null) {
    roomStr = ` ${property.roomCount}+${property.livingRoomCount || 0}`;
  }

  const indexStr = totalCount > 1 ? ` - Görsel ${index + 1} / ${totalCount}` : '';

  return `${location} ${listingTypeStr}${roomStr} ${typeObj.label}${indexStr}`;
}

/**
 * Generates centralized Metadata object for Property Detail pages.
 */
export function generatePropertyMetadata(property: Property): Metadata {
  const baseUrl = getBaseUrl();
  const listingTypeStr = property.listingType === 'FOR_SALE' ? 'Satılık' : 'Kiralık';
  const listingTypeLower = property.listingType === 'FOR_SALE' ? 'satılık' : 'kiralık';
  const typeObj = PROPERTY_TYPE_MAP[property.propertyType] || { label: 'Gayrimenkul', lower: 'gayrimenkul' };

  // 1. Title Construction
  // E.g., "3+1 Satılık Daire | Çukurova / Adana | Baştuğ Gayrimenkul"
  let mainSubject = typeObj.label;
  if (property.propertyType !== 'LAND' && property.roomCount !== undefined && property.roomCount !== null) {
    mainSubject = `${property.roomCount}+${property.livingRoomCount || 0} ${listingTypeStr} ${typeObj.label}`;
  } else {
    mainSubject = `${listingTypeStr} ${typeObj.label}`;
  }

  const title = `${mainSubject} | ${property.district} / ${property.city} | ${DEFAULT_SITE_NAME}`;

  // 2. Description Construction
  // E.g., "Adana Çukurova'da satılık 3+1 daire. 150 m². Asansörlü. Otoparklı. Detaylar için inceleyin."
  const roomDesc =
    property.propertyType !== 'LAND' && property.roomCount !== undefined && property.roomCount !== null
      ? ` ${property.roomCount}+${property.livingRoomCount || 0}`
      : '';
  const areaDesc = property.grossArea ? ` ${property.grossArea} m².` : '';

  const features: string[] = [];
  if (property.elevator) features.push('Asansörlü.');
  if (property.parking) features.push('Otoparklı.');
  if (property.balcony) features.push('Balkonlu.');
  if (property.furnished) features.push('Eşyalı.');

  const featureText = features.length > 0 ? ` ${features.join(' ')}` : '';
  const description = `${property.city} ${property.district}'da ${listingTypeLower}${roomDesc} ${typeObj.lower}.${areaDesc}${featureText} Detaylar için inceleyin.`;

  // 3. Image Selection with Fallback
  const coverImageObj = property.images?.find((img) => img.isCover) || property.images?.[0];
  const imageUrl = coverImageObj?.imageUrl || `${baseUrl}${DEFAULT_OG_IMAGE}`;
  const canonicalUrl = `${baseUrl}/properties/${property.slug}`;

  // 4. Keywords Generation
  const keywords = [
    `${property.city} ${listingTypeLower} ${typeObj.lower}`,
    `${property.district} ${listingTypeLower} ${typeObj.lower}`,
    `${property.city} gayrimenkul`,
    property.title,
    ...(property.neighborhood ? [`${property.neighborhood} emlak`] : []),
  ];

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: DEFAULT_SITE_NAME,
      locale: 'tr_TR',
      type: 'article',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: generatePropertyImageAlt(property, 0, 1),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

/**
 * Generates centralized Metadata object for standard static/list pages.
 */
export function generatePageMetadata({
  title,
  description,
  path = '',
  keywords = [],
  image = DEFAULT_OG_IMAGE,
}: {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  image?: string;
}): Metadata {
  const baseUrl = getBaseUrl();
  const canonicalUrl = getCanonicalUrl(path);
  const fullImageUrl = image.startsWith('http') ? image : `${baseUrl}${image}`;

  const pageKeywords = Array.from(new Set([...keywords, ...DEFAULT_SITE_KEYWORDS]));

  return {
    title,
    description,
    keywords: pageKeywords,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: DEFAULT_SITE_NAME,
      locale: 'tr_TR',
      type: 'website',
      images: [
        {
          url: fullImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [fullImageUrl],
    },
  };
}
