import { MetadataRoute } from 'next';
import { propertyService } from '@/services/property.service';
import { getBaseUrl } from '@/lib/seo';

export const revalidate = 3600; // Revalidate sitemap every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();

  const routes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/properties`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];

  try {
    const propertiesResponse = await propertyService.getProperties({ limit: 100 });
    const properties = propertiesResponse.data || [];

    // Ensure ONLY published properties are included in sitemap (EK MADDE 1)
    const publishedProperties = properties.filter((p) => p.isPublished !== false);

    const propertyRoutes: MetadataRoute.Sitemap = publishedProperties.map((property) => ({
      url: `${baseUrl}/properties/${property.slug}`,
      lastModified: property.updatedAt ? new Date(property.updatedAt) : new Date(property.createdAt),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    return [...routes, ...propertyRoutes];
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return routes;
  }
}
