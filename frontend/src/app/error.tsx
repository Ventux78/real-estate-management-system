"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-[#121212] py-20 text-center">
      <Container>
        <div className="mx-auto max-w-md">
          <h2 className="mb-4 text-3xl font-bold text-white">Bir Şeyler Yanlış Gitti</h2>
          <p className="mb-8 text-[#A1A1AA]">
            İsteğinizi işlerken beklenmedik bir hata oluştu. Lütfen tekrar deneyin.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button onClick={() => reset()} variant="primary">
              Tekrar Dene
            </Button>
            <Link href="/" className="inline-flex h-10 px-4 py-2 items-center justify-center rounded-md border border-[#333333] bg-transparent text-sm font-medium text-[#A1A1AA] hover:bg-[#121212] transition-colors">
              Ana Sayfaya Dön
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}

