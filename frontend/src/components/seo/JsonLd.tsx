import React from 'react';
import { Property } from '@/types/property';
import { getBaseUrl, DEFAULT_SITE_NAME, DEFAULT_SITE_DESCRIPTION } from '@/lib/seo';

export function OrganizationJsonLd() {
  const baseUrl = getBaseUrl();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: DEFAULT_SITE_NAME,
    url: baseUrl,
    logo: `${baseUrl}/icon.png`,
    image: `${baseUrl}/hero-section.png`,
    description: DEFAULT_SITE_DESCRIPTION,
    telephone: '+90 553 504 8585',
    email: 'bastuggayrimenkul@gmail.com',
    address: {
      '@type': 'PostalAddress',
      streetAddress:
        'BAYDEM AYTEKİN PLAZA, Esentepe, PROFESÖR DOKTOR NECMETTİN ERBAKAN BULVARI NO:359/1 B BLOK ZEMİN KAT NO:31',
      addressLocality: 'Çukurova',
      addressRegion: 'Adana',
      postalCode: '01170',
      addressCountry: 'TR',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 37.058574,
      longitude: 35.233126,
    },
    priceRange: '₺₺₺',
    sameAs: [],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

interface PropertyJsonLdProps {
  property: Property;
}

export function PropertyJsonLd({ property }: PropertyJsonLdProps) {
  const baseUrl = getBaseUrl();
  const propertyUrl = `${baseUrl}/properties/${property.slug}`;

  // Schema.org standard type resolution
  let schemaType = 'Residence';
  if (property.propertyType === 'APARTMENT') {
    schemaType = 'Apartment';
  } else if (property.propertyType === 'HOUSE') {
    schemaType = 'SingleFamilyResidence';
  } else if (property.propertyType === 'LAND' || property.propertyType === 'OFFICE' || property.propertyType === 'SHOP' || property.propertyType === 'WAREHOUSE') {
    schemaType = 'Accommodation';
  }

  const images = property.images && property.images.length > 0
    ? property.images.map((img) => img.imageUrl)
    : [`${baseUrl}/hero-section.png`];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: property.title,
    description: property.description || property.title,
    url: propertyUrl,
    image: images,
    address: {
      '@type': 'PostalAddress',
      addressLocality: property.district,
      addressRegion: property.city,
      addressCountry: 'TR',
    },
    offers: {
      '@type': 'Offer',
      price: property.price,
      priceCurrency: 'TRY',
      availability: 'https://schema.org/InStock',
      businessFunction:
        property.listingType === 'FOR_SALE'
          ? 'https://schema.org/Sell'
          : 'https://schema.org/Lease',
      url: propertyUrl,
    },
    ...(property.grossArea
      ? {
          floorSize: {
            '@type': 'QuantitativeValue',
            value: property.grossArea,
            unitCode: 'MTK',
          },
        }
      : {}),
    ...(property.roomCount !== undefined && property.roomCount !== null
      ? {
          numberOfRooms: property.roomCount + (property.livingRoomCount || 0),
        }
      : {}),
    ...(property.bathroomCount !== undefined && property.bathroomCount !== null
      ? {
          numberOfBathroomsTotal: property.bathroomCount,
        }
      : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
