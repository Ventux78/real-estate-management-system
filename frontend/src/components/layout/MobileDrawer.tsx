"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Home, Building2, Phone, MessageCircle, MapPin } from "lucide-react";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle ESC key press and Focus Trap
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 100);

    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC key to close
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      // Focus Trap on Tab
      if (e.key === "Tab" && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!mounted) return null;

  const navItems = [
    { href: "/", label: "Ana Sayfa", icon: Home },
    { href: "/properties", label: "İlanlar", icon: Building2 },
    { href: "/contact", label: "İletişim", icon: Phone },
  ];

  return createPortal(
    <div
      aria-hidden={!isOpen}
      className={`fixed inset-0 z-[9999] ${
        isOpen ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <aside
        ref={drawerRef}
        id="mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Mobil Navigasyon Menüsü"
        className={`fixed top-0 right-0 h-full w-[320px] max-w-[85vw] bg-[#18181B] border-l border-[#333333] shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header inside Drawer */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-[#333333] bg-[#121212]">
          <span className="text-lg font-bold text-white tracking-tight">Menü</span>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Menüyü Kapat"
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#333333] bg-[#1E1E1E] text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3.5 min-h-[44px] px-4 py-3 rounded-xl text-base font-medium transition-all ${
                  isActive
                    ? "bg-brand-500/15 text-brand-500 font-semibold border-l-4 border-brand-500 pl-3 shadow-sm"
                    : "text-neutral-300 hover:text-white hover:bg-neutral-800/70"
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-brand-500" : "text-neutral-400"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Contact Info Footer inside Drawer */}
        <div className="border-t border-[#333333] p-5 space-y-4 bg-[#121212]">
          <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            İletişim & Ulaşım
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {/* Phone Button */}
            <a
              href="tel:+905535048585"
              className="flex items-center gap-3 min-h-[44px] px-4 py-2.5 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-400 hover:bg-brand-500/20 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <Phone className="h-4 w-4 shrink-0 text-brand-500" />
              <div className="flex flex-col">
                <span className="text-xs text-neutral-400">Hızlı Ara</span>
                <span className="font-semibold text-white">+90 553 504 8585</span>
              </div>
            </a>

            {/* WhatsApp Button */}
            <a
              href="https://wa.me/905535048585"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/20 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#25D366]"
            >
              <MessageCircle className="h-4 w-4 shrink-0 text-[#25D366]" />
              <div className="flex flex-col">
                <span className="text-xs text-neutral-400">WhatsApp Mesaj</span>
                <span className="font-semibold text-white">Anında Ulaşın</span>
              </div>
            </a>
          </div>

          {/* Address Snippet */}
          <div className="flex items-start gap-2.5 pt-2 text-xs text-neutral-400">
            <MapPin className="h-4 w-4 shrink-0 text-neutral-400 mt-0.5" />
            <p className="line-clamp-2 leading-relaxed">
              BAYDEM AYTEKİN PLAZA, Esentepe, PROFESÖR DOKTOR NECMETTİN ERBAKAN BULVARI NO:359/1 B BLOK ZEMİN KAT NO:31, Çukurova/Adana
            </p>
          </div>
        </div>
      </aside>
    </div>,
    document.body
  );
}
