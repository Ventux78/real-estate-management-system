import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { Search, Home, MapPin, Key } from 'lucide-react';

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

      {/* Features */}
      <Section className="bg-[#121212]">
        <Container>
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Neden Bizi Seçmelisiniz?</h2>
            <p className="mt-4 text-lg text-[#A1A1AA]">Sektördeki tecrübemizle size en iyi hizmeti sunuyoruz.</p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: Home,
                title: "Geniş Portföy",
                desc: "Her bütçeye ve ihtiyaca uygun binlerce güncel ilan."
              },
              {
                icon: MapPin,
                title: "Doğru Konum",
                desc: "Şehrin en gözde lokasyonlarındaki fırsatları yakalayın."
              },
              {
                icon: Key,
                title: "Güvenli İşlem",
                desc: "Uzman kadromuzla tüm süreçlerde yanınızdayız."
              }
            ].map((f, i) => (
              <div key={i} className="rounded-2xl border border-[#333333] bg-[#1E1E1E] p-8 shadow-sm text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/10 text-brand-500">
                  <f.icon className="h-8 w-8" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-white">{f.title}</h3>
                <p className="text-[#A1A1AA]">{f.desc}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}

