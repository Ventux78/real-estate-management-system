import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { OrganizationJsonLd } from "@/components/seo/JsonLd";
import { getBaseUrl, DEFAULT_SITE_NAME, DEFAULT_SITE_DESCRIPTION, DEFAULT_OG_IMAGE } from "@/lib/seo";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: `${DEFAULT_SITE_NAME} | Türkiye'nin Güvenilir Emlak Platformu`,
    template: `%s | ${DEFAULT_SITE_NAME}`,
  },
  description: DEFAULT_SITE_DESCRIPTION,
  metadataBase: new URL(getBaseUrl()),
  alternates: {
    canonical: getBaseUrl(),
  },
  openGraph: {
    title: DEFAULT_SITE_NAME,
    description: DEFAULT_SITE_DESCRIPTION,
    url: getBaseUrl(),
    siteName: DEFAULT_SITE_NAME,
    locale: 'tr_TR',
    type: 'website',
    images: [
      {
        url: `${getBaseUrl()}${DEFAULT_OG_IMAGE}`,
        width: 1200,
        height: 630,
        alt: DEFAULT_SITE_NAME,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_SITE_NAME,
    description: DEFAULT_SITE_DESCRIPTION,
    images: [`${getBaseUrl()}${DEFAULT_OG_IMAGE}`],
  },
  robots: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${inter.variable} scroll-smooth`}>
      <head>
        <OrganizationJsonLd />
      </head>
      <body className={`${inter.className} min-h-screen bg-[#121212] text-white flex flex-col font-sans`}>
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
