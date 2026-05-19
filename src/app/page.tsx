import { Hero }              from '@/components/home/Hero'
import { TrustStrip }         from '@/components/home/TrustStrip'
import { PlatformFeatures }   from '@/components/home/PlatformFeatures'
import { WhyReveBatir }       from '@/components/home/WhyReveBatir'
import { HowItWorks }         from '@/components/home/HowItWorks'
import { PricingBlock }       from '@/components/home/PricingBlock'
import { FeaturedDeal }       from '@/components/home/FeaturedDeal'
import { PlatformProof }      from '@/components/home/PlatformProof'
import { Faq }                from '@/components/home/Faq'
import { CtaBanner }          from '@/components/home/CtaBanner'
import { getFeaturedDeal }    from '@/lib/contentful'

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
      <TrustStrip />
      <PlatformFeatures />
      <HowItWorks />
      <FeaturedDeal deal={featuredDeal} />
      <PricingBlock />
      <WhyReveBatir />
      <PlatformProof />
      <Faq />
      <CtaBanner />
    </>
  )
}
