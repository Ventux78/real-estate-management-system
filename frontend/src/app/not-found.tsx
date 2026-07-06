import Link from "next/link";
import { Container } from "@/components/ui/Container";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-[#121212] py-20 text-center">
      <Container>
        <div className="mx-auto max-w-md">
          <h1 className="mb-4 text-6xl font-bold text-brand-500">404</h1>
          <h2 className="mb-4 text-3xl font-bold text-white">Sayfa Bulunamadı</h2>
          <p className="mb-8 text-[#A1A1AA]">
            Aradığınız sayfa silinmiş, adı değiştirilmiş veya geçici olarak kullanılamıyor olabilir.
          </p>
          <div className="flex justify-center">
            <Link href="/" className="inline-flex h-10 px-4 py-2 items-center justify-center rounded-md bg-brand-500 text-sm font-medium text-white hover:bg-brand-600 transition-colors">
              Ana Sayfaya Dön
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}

