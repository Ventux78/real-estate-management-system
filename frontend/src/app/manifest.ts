import { MetadataRoute } from 'next';
import { DEFAULT_SITE_NAME, DEFAULT_SITE_DESCRIPTION } from '@/lib/seo';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: DEFAULT_SITE_NAME,
    short_name: 'Baştuğ Gayrimenkul',
    description: DEFAULT_SITE_DESCRIPTION,
    start_url: '/',
    display: 'standalone',
    background_color: '#121212',
    theme_color: '#FF6B00',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
