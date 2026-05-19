import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import {
  BILLING_PERIOD_LABEL,
  premiumMonthlyAmount,
  premiumAnnualAmount,
  PREMIUM_PREVIEW_HOURS,
  effectiveTier,
  type BillingPeriod,
} from '@/lib/subscriptions'
import { SubscriptionRequestForm } from '@/components/portal/SubscriptionRequestForm'

export const dynamic = 'force-dynamic'

const fmt = (n: number) => `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtDate = (d: Date | null) =>
  d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

export default async function PortalSubscriptionPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { subscription: true },
  })
  if (!user) redirect('/login')

  const monthly = premiumMonthlyAmount()
  const annual = premiumAnnualAmount()
  const monthlyAnnualised = monthly * 12
  const annualSavings = monthlyAnnualised - annual

  const tier = effectiveTier(user)
  const isCancelledButActive = tier === 'PREMIUM' && Boolean(user.subscription?.cancelledAt)

  return (
    <div>
      <h1 className="font-serif text-3xl font-light text-ivory mb-2">Subscription</h1>
      <p className="font-sans text-sm text-stone mb-8">
        Manage your Rêve Bâtir membership tier.
      </p>

      <section className="mb-12">
        <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">Current tier</p>
        <div className={`border p-5 ${tier === 'PREMIUM' ? 'border-gold bg-gold/5' : 'border-carbon'}`}>
          <p className="font-sans text-2xl text-ivory">
            {tier === 'PREMIUM' ? 'Premium' : 'Free'}
            {isCancelledButActive && (
              <span className="font-sans text-sm text-stone ml-3">(cancelled — ends {fmtDate(user.subscription!.nextRenewalAt)})</span>
            )}
          </p>
          {user.subscription && (
            <div className="mt-4 grid grid-cols-2 gap-6">
              <div>
                <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone mb-1">Billing</p>
                <p className="font-sans text-sm text-ivory">
                  {fmt(Number(user.subscription.amount))} {BILLING_PERIOD_LABEL[user.subscription.billingPeriod as BillingPeriod].toLowerCase()}
                </p>
              </div>
              <div>
                <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone mb-1">
                  {user.subscription.cancelledAt ? 'Access ends' : 'Next renewal'}
                </p>
                <p className="font-sans text-sm text-ivory">{fmtDate(user.subscription.nextRenewalAt)}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {tier === 'FREE' && (
        <section className="mb-12">
          <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">Upgrade to Premium</p>
          <div className="border border-carbon p-6 space-y-5">
            <div>
              <p className="font-sans text-sm text-ivory leading-relaxed mb-3">
                Premium members get a <strong>{PREMIUM_PREVIEW_HOURS}-hour head start</strong> on every new deal
                and priority placement in our matching workflow. Off-market sourcing moves fast — Premium
                puts you at the front of the queue.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-carbon p-4">
                <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone mb-1">Monthly</p>
                <p className="font-sans text-xl text-ivory">{fmt(monthly)}<span className="text-xs text-stone"> /mo</span></p>
              </div>
              <div className="border border-gold bg-gold/5 p-4">
                <p className="font-sans text-[0.55rem] uppercase tracking-widest text-gold mb-1">
                  Annual {annualSavings > 0 && <span className="text-ivory">— save {fmt(annualSavings)}</span>}
                </p>
                <p className="font-sans text-xl text-ivory">{fmt(annual)}<span className="text-xs text-stone"> /yr</span></p>
              </div>
            </div>
            <p className="font-sans text-xs text-stone leading-relaxed">
              We&rsquo;ll activate your tier and send your first invoice by bank transfer.
            </p>
            <div className="pt-2">
              <SubscriptionRequestForm allowedTypes={['UPGRADE']} />
            </div>
          </div>
        </section>
      )}

      {tier === 'PREMIUM' && !user.subscription?.cancelledAt && (
        <section>
          <p className="font-sans text-xs text-stone mb-3">
            Need to change your plan or cancel?
          </p>
          <SubscriptionRequestForm allowedTypes={['CHANGE_MONTHLY', 'CHANGE_ANNUAL', 'CANCEL']} />
        </section>
      )}
    </div>
  )
}
