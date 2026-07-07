import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { Search } from 'lucide-react';
import { LatestPropertiesSection } from '@/components/properties/LatestPropertiesSection';

export const revalidate = 60; // ISR cache (1 dakika)


export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative flex min-h-[80vh] items-center justify-center overflow-hidden bg-[#121212] py-20 text-white">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40"
          style={{ backgroundImage: "url('/hero-arkaplan.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
        
        <Container className="relative z-10 text-center">
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Hayalinizdeki Evi <span className="text-brand-300">Keşfedin</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-[#A1A1AA] sm:text-xl">
            Binlerce premium gayrimenkul ilanı arasından size en uygun olanı bulun. 
            Güvenilir, hızlı ve modern emlak deneyimi.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/properties" className="inline-flex h-14 w-full sm:w-auto items-center justify-center rounded-md bg-brand-500 px-8 text-lg font-medium text-white hover:bg-brand-600 transition-colors">
              <Search className="mr-2 h-5 w-5" />
              İlanları İncele
            </Link>
            <Link href="/contact" className="inline-flex h-14 w-full sm:w-auto items-center justify-center rounded-md border border-white/30 bg-transparent px-8 text-lg font-medium text-white hover:bg-[#121212]/10 transition-colors">
              Bize Ulaşın
            </Link>
          </div>
        </Container>
      </section>

      {/* Latest Properties */}
      <LatestPropertiesSection />
    </>
  );
}

