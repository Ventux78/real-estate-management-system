import { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { Mail, MapPin, Phone, MessageCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'İletişim | Gayrimenkul',
  description: 'Bizimle iletişime geçin, sorularınızı yanıtlamaktan memnuniyet duyarız.',
};

export default function ContactPage() {
  return (
    <>
      <section className="relative bg-[#121212] py-20 text-white overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40"
          style={{ backgroundImage: "url('/iletisim-foto.jpg')" }}
        />
        <div className="absolute inset-0 bg-[#121212]/60" />
        <Container className="relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-6 text-white drop-shadow-md">İletişim</h1>
            <p className="text-xl text-[#A1A1AA] drop-shadow">
              Sorularınız, önerileriniz veya ilan vermek için bize ulaşın. Ekibimiz en kısa sürede size dönüş yapacaktır.
            </p>
          </div>
        </Container>
      </section>

      <Section className="bg-[#121212]">
        <Container>
          <div className="grid md:grid-cols-2 gap-12">
            
            {/* Contact Info */}
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">İletişim Bilgileri</h2>
                <div className="space-y-6">
                  <div className="flex items-start">
                    <MapPin className="w-6 h-6 text-brand-500 mt-1 mr-4" />
                    <div>
                      <h4 className="font-semibold text-white">Adres</h4>
                      <p className="text-[#A1A1AA] mt-1">BAYDEM AYTEKİN PLAZA, Esentepe, PROFESÖR DOKTOR NECMETTİN ERBAKAN BULVARI NO:359/1 B BLOK ZEMİN KAT NO:31, 01170 Çukurova/Adana</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Phone className="w-6 h-6 text-brand-500 mt-1 mr-4" />
                    <div>
                      <h4 className="font-semibold text-white">Telefon</h4>
                      <p className="text-[#A1A1AA] mt-1">+90 553 504 8585 - Ali Baştuğ<br/>(0322) 504 02 39</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Mail className="w-6 h-6 text-brand-500 mt-1 mr-4" />
                    <div>
                      <h4 className="font-semibold text-white">E-Posta</h4>
                      <p className="text-[#A1A1AA] mt-1">bastuggayrimenkul@gmail.com</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Map Embedded */}
              <div className="mt-8 rounded-xl overflow-hidden border border-[#333333] shadow-sm h-64 relative">
                <iframe 
                  width="100%" 
                  height="100%" 
                  frameBorder="0" 
                  scrolling="no" 
                  marginHeight={0} 
                  marginWidth={0} 
                  src="https://maps.google.com/maps?q=37.058574,35.233126&t=&z=15&ie=UTF8&iwloc=&output=embed"
                  title="Ofis Konumu"
                  className="absolute inset-0"
                />
              </div>
            </div>

            {/* WhatsApp Contact */}
            <div className="bg-[#1E1E1E] p-8 rounded-2xl shadow-sm border border-[#333333] flex flex-col items-center justify-center text-center space-y-6 h-[450px]">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#25D366]/10 text-[#25D366]">
                <MessageCircle className="h-12 w-12" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-3">WhatsApp&apos;tan Ulaşın</h3>
                <p className="text-[#A1A1AA] text-lg">
                  Sorularınız için bize WhatsApp üzerinden anında ulaşabilirsiniz.
                </p>
              </div>
              <a
                href="https://wa.me/905535048585"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-14 w-full items-center justify-center rounded-md bg-[#25D366] px-8 text-lg font-medium text-white hover:bg-[#128C7E] transition-colors shadow-sm mt-4"
              >
                <MessageCircle className="mr-2 h-6 w-6" />
                WhatsApp ile Mesaj Gönder
              </a>
            </div>

          </div>
        </Container>
      </Section>
    </>
  );
}

