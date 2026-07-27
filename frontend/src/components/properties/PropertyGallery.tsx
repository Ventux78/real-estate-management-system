"use client";

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Property, PropertyImage } from '@/types/property';
import { cn } from '@/lib/utils';
import { ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { generatePropertyImageAlt } from '@/lib/seo';

interface PropertyGalleryProps {
  property?: Partial<Property>;
  images: PropertyImage[];
  title: string;
}

export function PropertyGallery({ property, images, title }: PropertyGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number>(0);

  useEffect(() => {
    if (images && images.length > 0) {
      const coverIndex = images.findIndex((i) => i.isCover);
      setActiveIndex(coverIndex !== -1 ? coverIndex : 0);
    }
  }, [images]);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  if (!images || images.length === 0) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center rounded-xl bg-[#121212] text-slate-400">
        <ImageIcon className="mb-4 h-16 w-16 opacity-50" />
        <p className="font-medium">Görsel bulunmuyor</p>
      </div>
    );
  }

  const activeImage = images[activeIndex];
  const activeAlt = property
    ? generatePropertyImageAlt(property, activeIndex, images.length)
    : `${title} - Görsel ${activeIndex + 1} / ${images.length}`;

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-[#121212] shadow-inner group">
        {activeImage && (
          <Image
            src={activeImage.imageUrl}
            alt={activeAlt}
            fill
            priority
            sizes="(min-width: 1280px) 1000px, (min-width: 768px) 800px, 100vw"
            className="object-contain transition-opacity duration-300"
          />
        )}

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white opacity-0 transition-all hover:bg-black/70 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-brand-400"
              aria-label="Önceki görsel"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white opacity-0 transition-all hover:bg-black/70 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-brand-400"
              aria-label="Sonraki görsel"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-4 overflow-x-auto pb-2 pt-1 scrollbar-hide">
          {images.map((img, idx) => {
            const thumbAlt = property
              ? generatePropertyImageAlt(property, idx, images.length)
              : `${title} küçük görsel ${idx + 1}`;

            return (
              <button
                key={img.id}
                onClick={() => setActiveIndex(idx)}
                className={cn(
                  'relative h-20 w-32 flex-shrink-0 overflow-hidden rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2',
                  activeIndex === idx
                    ? 'ring-2 ring-brand-500 ring-offset-2'
                    : 'opacity-70 hover:opacity-100'
                )}
                aria-label={`${idx + 1}. görsele git`}
                aria-current={activeIndex === idx ? 'true' : 'false'}
              >
                <Image
                  src={img.imageUrl}
                  alt={thumbAlt}
                  fill
                  loading="lazy"
                  sizes="128px"
                  className="object-cover"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
