import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Home, Phone } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#333333] bg-[#121212]/80 backdrop-blur-md">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 text-brand-500 transition-colors hover:text-brand-600">
            <Home className="h-6 w-6" />
            <span className="text-xl font-bold tracking-tight">Baştuğ Gayrimenkul</span>
          </Link>
          
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-[#A1A1AA]">
            <Link href="/" className="hover:text-brand-500 transition-colors">Ana Sayfa</Link>
            <Link href="/properties" className="hover:text-brand-500 transition-colors">İlanlar</Link>
            <Link href="/contact" className="hover:text-brand-500 transition-colors">İletişim</Link>
          </nav>
          
          <div className="flex items-center">
            <Link 
              href="/contact" 
              className="hidden sm:inline-flex h-9 px-4 items-center justify-center rounded-md font-medium text-sm bg-brand-500 text-white hover:bg-brand-600 transition-colors"
            >
              <Phone className="mr-2 h-4 w-4" />
              Bizi Arayın
            </Link>
          </div>
        </div>
      </Container>
    </header>
  );
}

