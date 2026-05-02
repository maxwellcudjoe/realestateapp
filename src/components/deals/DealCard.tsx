'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { Deal } from '@/types/deal'
import { RequestPackModal } from './RequestPackModal'
import { PhotoGallery } from './PhotoGallery'

export function DealCard({ deal }: { deal: Deal }) {
  const [packModalOpen, setPackModalOpen] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)

  // All photos: cover first, then gallery extras (deduped)
  const allPhotos = [
    ...(deal.imageUrl ? [deal.imageUrl] : []),
    ...deal.galleryUrls.filter((u) => u !== deal.imageUrl),
  ]
  const photoCount = allPhotos.length

  return (
    <>
      <div className="bg-charcoal border border-carbon overflow-hidden group">
        <button
          onClick={() => photoCount > 0 && setGalleryOpen(true)}
          className="relative block w-full h-48 bg-[#1a1a1a] cursor-pointer disabled:cursor-default"
          disabled={photoCount === 0}
          aria-label={photoCount > 0 ? `View ${photoCount} photos` : 'No photos available'}
        >
          {deal.imageUrl ? (
            <Image
              src={deal.imageUrl}
              alt={deal.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center font-sans text-xs uppercase tracking-widest text-[#333]">
              Property Photo
            </div>
          )}

          {/* BMV badge */}
          <div className="absolute top-3 right-3 bg-gold text-obsidian font-sans text-xs font-bold px-3 py-1">
            {Math.round(deal.bmvPercentage)}% BMV
          </div>

          {/* Strategy badge */}
          <div className="absolute bottom-3 left-3 border border-carbon bg-charcoal/80 font-sans text-[0.55rem] uppercase tracking-widest text-stone px-2 py-1">
            {deal.strategy}
          </div>

          {/* Photo-count badge — only when there's more than 1 photo */}
          {photoCount > 1 && (
            <div className="absolute bottom-3 right-3 border border-carbon bg-charcoal/80 font-sans text-[0.55rem] uppercase tracking-widest text-ivory px-2 py-1 flex items-center gap-1">
              <span>📷</span>
              <span>{photoCount} Photos</span>
            </div>
          )}
        </button>

        <div className="p-5">
          <p className="font-sans text-[0.6rem] font-semibold uppercase tracking-widest text-gold mb-1">
            {deal.location}
          </p>
          <p className="font-serif text-lg text-ivory mb-4">{deal.title}</p>

          <div className="grid grid-cols-2 gap-3 py-3 border-t border-carbon mb-4">
            {[
              { label: 'Purchase Price', value: `£${deal.purchasePrice.toLocaleString()}`, gold: true },
              { label: 'Market Value',   value: `£${deal.marketValue.toLocaleString()}`,   gold: false },
              { label: 'Gross Yield',    value: `${deal.grossYield}%`,                     gold: true },
              { label: 'Sourcing Fee',   value: `£${deal.sourcingFee.toLocaleString()}`,   gold: false },
            ].map(({ label, value, gold }) => (
              <div key={label}>
                <p className="font-sans text-[0.5rem] uppercase tracking-widest text-stone mb-0.5">{label}</p>
                <p className={`font-serif text-lg ${gold ? 'text-gold' : 'text-ivory'}`}>{value}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => setPackModalOpen(true)}
            className="w-full py-3 border border-gold text-gold font-sans text-xs font-semibold uppercase tracking-widest hover:bg-gold hover:text-obsidian transition-colors"
          >
            Request Full Pack
          </button>
        </div>
      </div>

      {packModalOpen && (
        <RequestPackModal
          dealTitle={deal.title}
          onClose={() => setPackModalOpen(false)}
        />
      )}

      {galleryOpen && (
        <PhotoGallery
          photos={allPhotos}
          alt={deal.title}
          onClose={() => setGalleryOpen(false)}
        />
      )}
    </>
  )
}
