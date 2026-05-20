import { Hero }              from '@/components/home/Hero'
import { TrustStrip }         from '@/components/home/TrustStrip'
import { PlatformFeatures }   from '@/components/home/PlatformFeatures'
import { WhyReveBatir }       from '@/components/home/WhyReveBatir'
import { HowItWorks }         from '@/components/home/HowItWorks'
import { PricingBlock }       from '@/components/home/PricingBlock'
import { FeaturedDeal }       from '@/components/home/FeaturedDeal'
import { PlatformProof }      from '@/components/home/PlatformProof'
import { Faq }                from '@/components/home/Faq'
import { Testimonials }       from '@/components/home/Testimonials'
import { InsightsTeaser }     from '@/components/home/InsightsTeaser'
import { CtaBanner }          from '@/components/home/CtaBanner'
import { BrandDivider }       from '@/components/ui/BrandDivider'
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
      <BrandDivider className="bg-obsidian" />
      <HowItWorks />
      <FeaturedDeal deal={featuredDeal} />
      <PricingBlock />
      <BrandDivider className="bg-obsidian" />
      <WhyReveBatir />
      <PlatformProof />
      <Testimonials />
      <Faq />
      <InsightsTeaser />
      <CtaBanner />
    </>
  )
}
