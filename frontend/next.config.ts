import type { NextConfig } from "next";

/**
 * Returns security-related HTTP headers for SEO and browser hardening.
 */
function getSecurityHeaders() {
  return [
    {
      key: 'X-DNS-Prefetch-Control',
      value: 'on',
    },
    {
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload',
    },
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff',
    },
    {
      key: 'Referrer-Policy',
      value: 'origin-when-cross-origin',
    },
    {
      key: 'X-Frame-Options',
      value: 'SAMEORIGIN',
    },
  ];
}

/**
 * Returns cache headers for static assets to improve Lighthouse performance.
 */
function getCacheHeaders() {
  return [
    {
      key: 'Cache-Control',
      value: 'public, max-age=31536000, immutable',
    },
  ];
}

const nextConfig: NextConfig = {
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: getSecurityHeaders(),
      },
      {
        source: '/static/:path*',
        headers: getCacheHeaders(),
      },
    ];
  },
};

export default nextConfig;