import { Container } from '@/components/ui/Container';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-[#333333] bg-[#121212] py-12 text-[#A1A1AA]">
      <Container>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Baştuğ Gayrimenkul</h3>
            <p className="mt-4 text-sm">
              Profesyonel gayrimenkul yönetim ve vitrin platformu. Modern, güvenilir ve yenilikçi çözümler.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-white">Hızlı Linkler</h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/properties" className="hover:text-brand-500">Satılık & Kiralık İlanlar</Link></li>
              <li><Link href="/contact" className="hover:text-brand-500">İletişim</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-white">İletişim Bilgileri</h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li>Adres: BAYDEM AYTEKİN PLAZA, Esentepe, PROFESÖR DOKTOR NECMETTİN ERBAKAN BULVARI NO:359/1 B BLOK ZEMİN KAT NO:31, 01170 Çukurova/Adana</li>
              <li>Tel: +90 553 504 8585 - Ali Baştuğ</li>
              <li>Tel: (0322) 504 02 39</li>
              <li>E-posta: bastuggayrimenkul@gmail.com</li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-[#333333] pt-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Baştuğ Gayrimenkul A.Ş. Tüm hakları saklıdır.</p>
        </div>
      </Container>
    </footer>
  );
}

