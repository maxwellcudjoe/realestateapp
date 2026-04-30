import { SectionLabel } from '@/components/ui/SectionLabel'
import { GoldDivider } from '@/components/ui/GoldDivider'

const SERVICES = [
  {
    icon: '🏠',
    title: 'Deal Sourcing',
    body: 'We find below-market-value properties across the UK and package them with full due diligence packs for investors.',
  },
  {
    icon: '📈',
    title: 'Buy To Let',
    body: 'Residential investment properties hand-selected for strong rental yields and long-term capital growth.',
  },
  {
    icon: '🔑',
    title: 'Acquisition Support',
    body: 'End-to-end support from the initial deal introduction through to legal completion.',
  },
]

export function WhatWeDo() {
  return (
    <section className="bg-[#0e0e0e] py-24 px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <SectionLabel className="mb-4">Our Services</SectionLabel>
          <h2 className="font-serif text-4xl font-light text-ivory">What We Do</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-carbon">
          {SERVICES.map(({ icon, title, body }) => (
            <div key={title} className="bg-[#0e0e0e] p-10 flex flex-col gap-5">
              <span className="text-3xl">{icon}</span>
              <GoldDivider />
              <h3 className="font-serif text-2xl font-normal text-ivory">{title}</h3>
              <p className="font-sans text-sm font-light text-stone leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
