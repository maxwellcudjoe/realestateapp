import Image from 'next/image'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { getTestimonials, getInitialsFromName, type Testimonial } from '@/lib/testimonials'

export async function Testimonials() {
  const items = await getTestimonials({ featured: true, limit: 3 })
  if (items.length === 0) return null

  const reviewListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((t, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Review',
        reviewBody: t.quote,
        author: { '@type': 'Person', name: t.name },
        itemReviewed: {
          '@type': 'Organization',
          name: 'Rêve Bâtir',
          url: 'https://www.revebatir.co.uk',
        },
      },
    })),
  }

  return (
    <section className="bg-[#0e0e0e] py-24 px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewListJsonLd) }}
      />
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <SectionLabel className="mb-4">Investor Feedback</SectionLabel>
          <h2 className="font-serif text-4xl font-light text-ivory">What investors say</h2>
          <p className="font-sans text-xs text-stone mt-4 max-w-xl mx-auto">
            All testimonials below are from real investors with documented consent. Quotes are
            verbatim — we don&rsquo;t edit.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-carbon">
          {items.map((t) => (
            <TestimonialCard key={t.id} testimonial={t} />
          ))}
        </div>
      </div>
    </section>
  )
}

function TestimonialCard({ testimonial: t }: { testimonial: Testimonial }) {
  return (
    <div className="bg-charcoal p-8 flex flex-col gap-5">
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className="text-gold text-sm" aria-hidden="true">★</span>
        ))}
        <span className="sr-only">Five-star rating</span>
      </div>
      <blockquote className="font-serif text-lg font-light italic text-stone leading-relaxed flex-1">
        &ldquo;{t.quote}&rdquo;
      </blockquote>
      <div className="flex items-center gap-4 mt-2">
        {t.photoUrl ? (
          <div className="relative w-12 h-12 rounded-full overflow-hidden border border-carbon">
            <Image
              src={t.photoUrl}
              alt={`Photo of ${t.name}`}
              fill
              sizes="48px"
              className="object-cover"
            />
          </div>
        ) : (
          <div
            aria-hidden="true"
            className="w-12 h-12 rounded-full border border-carbon bg-obsidian flex items-center justify-center font-serif text-sm text-gold"
          >
            {getInitialsFromName(t.name)}
          </div>
        )}
        <div>
          <p className="font-sans text-xs font-semibold uppercase tracking-widest text-ivory">{t.name}</p>
          <p className="font-sans text-xs text-stone mt-0.5">{t.role}</p>
        </div>
      </div>
    </div>
  )
}
