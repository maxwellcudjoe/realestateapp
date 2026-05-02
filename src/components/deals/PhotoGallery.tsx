'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface Props {
  photos: string[]
  alt: string
  onClose: () => void
}

export function PhotoGallery({ photos, alt, onClose }: Props) {
  const [index, setIndex] = useState(0)

  // Lock body scroll while open
  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [])

  // Keyboard navigation
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.length])

  function next() {
    setIndex((i) => (i + 1) % photos.length)
  }
  function prev() {
    setIndex((i) => (i - 1 + photos.length) % photos.length)
  }

  if (photos.length === 0) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-obsidian/95 p-4 sm:p-8"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        aria-label="Close gallery"
        className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 border border-carbon text-stone hover:border-gold hover:text-gold transition-colors text-lg leading-none"
      >
        ×
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 font-sans text-[0.6rem] uppercase tracking-widest text-gold">
        {index + 1} / {photos.length}
      </div>

      {/* Image */}
      <div className="relative w-full max-w-5xl aspect-[4/3] sm:aspect-[16/10]">
        <Image
          key={photos[index]}
          src={photos[index]}
          alt={`${alt} — photo ${index + 1}`}
          fill
          className="object-contain"
          priority
        />
      </div>

      {/* Prev / Next — only if more than one photo */}
      {photos.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous photo"
            className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 border border-carbon text-stone hover:border-gold hover:text-gold transition-colors flex items-center justify-center"
          >
            ‹
          </button>
          <button
            onClick={next}
            aria-label="Next photo"
            className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 border border-carbon text-stone hover:border-gold hover:text-gold transition-colors flex items-center justify-center"
          >
            ›
          </button>
        </>
      )}

      {/* Thumbnail strip — desktop only */}
      {photos.length > 1 && (
        <div className="hidden md:flex absolute bottom-6 left-1/2 -translate-x-1/2 gap-2 max-w-[90vw] overflow-x-auto">
          {photos.map((p, i) => (
            <button
              key={p}
              onClick={() => setIndex(i)}
              className={`relative w-16 h-12 flex-shrink-0 border transition-colors ${
                i === index
                  ? 'border-gold'
                  : 'border-carbon hover:border-stone'
              }`}
              aria-label={`Photo ${i + 1}`}
            >
              <Image
                src={p}
                alt=""
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
