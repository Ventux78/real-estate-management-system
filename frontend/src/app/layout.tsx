import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Modern Gayrimenkul Platformu",
  description: "Türkiye'nin en yenilikçi ve güvenilir gayrimenkul ilan platformu. Satılık, kiralık evler, arsalar ve ofisler.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  openGraph: {
    title: "Modern Gayrimenkul Platformu",
    description: "Türkiye'nin en yenilikçi ve güvenilir gayrimenkul ilan platformu. Satılık, kiralık evler, arsalar ve ofisler.",
    url: '/',
    siteName: 'Gayrimenkul',
    locale: 'tr_TR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Modern Gayrimenkul Platformu",
    description: "Türkiye'nin en yenilikçi ve güvenilir gayrimenkul ilan platformu.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="scroll-smooth">
      <body className={`${inter.className} min-h-screen bg-[#121212] text-white flex flex-col`}>
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}

