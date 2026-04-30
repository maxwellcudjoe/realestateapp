import { Hero }           from '@/components/home/Hero'
import { WhatWeDo }       from '@/components/home/WhatWeDo'
import { WhyReveBatir }  from '@/components/home/WhyReveBatir'
import { HowItWorks }     from '@/components/home/HowItWorks'
import { FeaturedDeal }   from '@/components/home/FeaturedDeal'
import { Testimonials }   from '@/components/home/Testimonials'
import { CtaBanner }      from '@/components/home/CtaBanner'
import { getFeaturedDeal } from '@/lib/contentful'

export const revalidate = 60

export default async function HomePage() {
  let featuredDeal = null
  try {
    featuredDeal = await getFeaturedDeal()
  } catch {
    featuredDeal = null
  }

  return (
    <>
      <Hero />
      <WhatWeDo />
      <WhyReveBatir />
      <HowItWorks />
      <FeaturedDeal deal={featuredDeal} />
      <Testimonials />
      <CtaBanner />
    </>
  )
}
