"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Container } from "@/components/ui/Container";
import { Phone, Menu } from "lucide-react";

// Lazy load MobileDrawer component for desktop bundle optimization
const MobileDrawer = dynamic(() => import("./MobileDrawer"), { ssr: false });

export function Header() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    // Return focus to hamburger button when drawer closes
    setTimeout(() => {
      hamburgerRef.current?.focus();
    }, 50);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#333333] bg-[#121212]/80 backdrop-blur-md">
      <Container>
        <div className="flex h-16 items-center justify-between">
          {/* Logo & Brand Name */}
          <Link
            href="/"
            className="flex items-center space-x-2 text-brand-500 transition-colors hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded-lg p-1"
          >
            <Image
              src="/icon.png?v=1"
              alt="Baştuğ Gayrimenkul Logo"
              width={24}
              height={24}
              className="h-6 w-auto"
              unoptimized
            />
            <span className="text-xl font-bold tracking-tight">Baştuğ Gayrimenkul</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-[#A1A1AA]">
            <Link href="/" className="hover:text-brand-500 transition-colors">
              Ana Sayfa
            </Link>
            <Link href="/properties" className="hover:text-brand-500 transition-colors">
              İlanlar
            </Link>
            <Link href="/contact" className="hover:text-brand-500 transition-colors">
              İletişim
            </Link>
          </nav>

          {/* Desktop CTA & Mobile Hamburger Toggle */}
          <div className="flex items-center space-x-3">
            {/* Desktop CTA */}
            <Link
              href="/contact"
              className="hidden sm:inline-flex h-9 px-4 items-center justify-center rounded-md font-medium text-sm bg-brand-500 text-white hover:bg-brand-600 transition-colors"
            >
              <Phone className="mr-2 h-4 w-4" />
              Bizi Arayın
            </Link>

            {/* Mobile Hamburger Button (Min 44px Touch Target) */}
            <button
              ref={hamburgerRef}
              type="button"
              onClick={() => setIsDrawerOpen((prev) => !prev)}
              aria-expanded={isDrawerOpen}
              aria-controls="mobile-drawer"
              aria-label={isDrawerOpen ? "Navigasyon Menüsünü Kapat" : "Navigasyon Menüsünü Aç"}
              className="md:hidden flex h-11 w-11 items-center justify-center rounded-lg border border-[#333333] bg-[#1E1E1E] text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </Container>

      {/* Mobile Drawer (Lazy Loaded) */}
      <MobileDrawer isOpen={isDrawerOpen} onClose={handleCloseDrawer} />
    </header>
  );
}
