import { Button } from '@/components/ui/Button'
import { premiumMonthlyAmount } from '@/lib/subscriptions'

export function CtaBanner() {
  const monthly = premiumMonthlyAmount()

  return (
    <section
      className="py-24 px-8 border-t border-b border-gold/10"
      style={{
        background: 'linear-gradient(135deg, #231b0d 0%, #30240f 50%, #231b0d 100%)',
      }}
    >
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="font-serif text-4xl md:text-5xl font-light text-ivory mb-3">
          Three minutes to register.<br />
          <span className="text-gold">A lifetime of compounding.</span>
        </h2>
        <p className="font-sans text-sm font-light text-stone tracking-wide mb-10 max-w-xl mx-auto">
          Free forever. No credit card required. Upgrade to Premium any time from your portal.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button href="/onboarding">Register Free</Button>
          <Button href="/onboarding?tier=premium" variant="secondary">
            Start Premium · £{monthly}/mo
          </Button>
        </div>
      </div>
    </section>
  )
}
