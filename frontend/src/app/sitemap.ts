import { MetadataRoute } from 'next';
import { propertyService } from '@/services/property.service';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  // Base routes
  const routes = [
    '',
    '/properties',
    '/about',
    '/contact',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  try {
    // Get all properties for dynamic routes
    const propertiesResponse = await propertyService.getProperties({ limit: 1000 });
    
    const propertyRoutes = propertiesResponse.data.map((property) => ({
      url: `${baseUrl}/properties/${property.slug}`,
      lastModified: new Date(property.updatedAt).toISOString(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

    return [...routes, ...propertyRoutes];
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return routes; // Return base routes if API fails
  }
}
