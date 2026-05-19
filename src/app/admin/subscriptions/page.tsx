import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { RenewalGeneratorButton } from '@/components/admin/RenewalGeneratorButton'
import { BILLING_PERIOD_LABEL, type BillingPeriod } from '@/lib/subscriptions'
import {
  pendingSubscriptionRequests,
  parseRequestTypeFromBody,
  elapsedSince,
  SUBSCRIPTION_REQUEST_SUBJECT_PREFIX,
  SUBSCRIPTION_REQUEST_WINDOW_DAYS,
} from '@/lib/subscription-requests'

export const dynamic = 'force-dynamic'

const fmt = (n: number) => `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtDate = (d: Date | null) =>
  d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export default async function AdminSubscriptionsPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') redirect('/login')

  const requestWindowStart = new Date(Date.now() - SUBSCRIPTION_REQUEST_WINDOW_DAYS * 24 * 60 * 60 * 1000)

  const [subscriptions, recentInvoices, requestMessages] = await Promise.all([
    prisma.subscription.findMany({
      orderBy: { nextRenewalAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            tier: true,
            investorProfile: {
              select: { firstName: true, lastName: true, application: { select: { id: true } } },
            },
          },
        },
      },
    }),
    prisma.invoice.findMany({
      where: { type: 'SUBSCRIPTION' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: { email: true, investorProfile: { select: { firstName: true, lastName: true } } } } },
    }),
    prisma.message.findMany({
      where: {
        subject: { startsWith: SUBSCRIPTION_REQUEST_SUBJECT_PREFIX },
        createdAt: { gte: requestWindowStart },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        senderUser: { select: { id: true, role: true } },
        application: {
          select: {
            id: true,
            investorProfile: { select: { firstName: true, lastName: true, user: { select: { email: true } } } },
          },
        },
      },
    }),
  ])

  // Pull all admin replies on the same applicationIds in the window so we can
  // mark requests "actioned" when an admin replied after the request landed.
  const requestAppIds = Array.from(new Set(requestMessages.map((m) => m.applicationId)))
  const adminReplyMessages = requestAppIds.length > 0
    ? await prisma.message.findMany({
        where: {
          applicationId: { in: requestAppIds },
          createdAt: { gte: requestWindowStart },
          senderUser: { role: 'admin' },
        },
        select: { applicationId: true, senderUserId: true, createdAt: true },
      })
    : []

  const investorRequests = requestMessages.filter((m) => m.senderUser?.role !== 'admin')
  const pendingRequests = pendingSubscriptionRequests(
    investorRequests.map((m) => ({
      id: m.id,
      applicationId: m.applicationId,
      senderUserId: m.senderUserId,
      subject: m.subject,
      body: m.body,
      createdAt: m.createdAt,
    })),
    adminReplyMessages,
  )
  const requestById = new Map(requestMessages.map((m) => [m.id, m]))

  const now = new Date()
  const cutoff7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const active = subscriptions.filter((s) => !s.cancelledAt)
  const cancelled = subscriptions.filter((s) => s.cancelledAt)
  const dueWithin7d = active.filter((s) => s.nextRenewalAt <= cutoff7d)
  const mrr = active
    .filter((s) => s.billingPeriod === 'MONTHLY')
    .reduce((sum, s) => sum + Number(s.amount), 0)
    + active
      .filter((s) => s.billingPeriod === 'ANNUAL')
      .reduce((sum, s) => sum + Number(s.amount) / 12, 0)

  return (
    <div>
      <h1 className="font-serif text-4xl font-light text-ivory mb-2">Subscriptions</h1>
      <p className="font-sans text-sm text-stone mb-8">
        Premium tier members and renewal billing.
      </p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="border border-carbon p-5">
          <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone mb-1">Active subscribers</p>
          <p className="font-sans text-2xl text-ivory">{active.length}</p>
        </div>
        <div className="border border-carbon p-5">
          <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone mb-1">Approx MRR</p>
          <p className="font-sans text-2xl text-gold">{fmt(mrr)}</p>
          <p className="font-sans text-[0.6rem] text-stone mt-1">Annual subs amortised /12</p>
        </div>
        <div className="border border-carbon p-5">
          <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone mb-1">Renewals due ≤ 7 days</p>
          <p className={`font-sans text-2xl ${dueWithin7d.length > 0 ? 'text-gold' : 'text-stone'}`}>{dueWithin7d.length}</p>
        </div>
      </div>

      <section className="mb-12">
        <RenewalGeneratorButton />
      </section>

      {pendingRequests.length > 0 && (
        <section className="mb-12">
          <h2 className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">
            Pending subscription requests · {pendingRequests.length}
          </h2>
          <div className="border border-gold/30 bg-gold/5">
            {pendingRequests.map((r) => {
              const full = requestById.get(r.id)
              const appId = full?.application?.id
              const profile = full?.application?.investorProfile
              const fullName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : ''
              const name = fullName || profile?.user.email || 'Unknown'
              const requestType = parseRequestTypeFromBody(r.body) ?? r.subject.replace(SUBSCRIPTION_REQUEST_SUBJECT_PREFIX, '').trim()
              return (
                <div key={r.id} className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-gold/20 last:border-b-0 items-start">
                  <div className="col-span-3">
                    <p className="font-sans text-sm text-ivory">{name}</p>
                    <p className="font-sans text-[0.65rem] text-stone">{profile?.user.email}</p>
                  </div>
                  <div className="col-span-3 font-sans text-sm text-gold">{requestType}</div>
                  <div className="col-span-4 font-sans text-xs text-stone whitespace-pre-line line-clamp-3">
                    {r.body}
                  </div>
                  <div className="col-span-2 flex flex-col items-end gap-1">
                    <span className="font-sans text-[0.55rem] uppercase tracking-widest text-stone">
                      {elapsedSince(r.createdAt)}
                    </span>
                    {appId && (
                      <Link href={`/admin/investors/${appId}`} className="font-sans text-[0.6rem] uppercase tracking-widest text-gold hover:text-ivory transition-colors">
                        Open profile →
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="mb-12">
        <h2 className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">Active subscribers</h2>
        {active.length === 0 ? (
          <p className="font-sans text-sm text-stone">No active subscribers.</p>
        ) : (
          <div className="border border-carbon">
            <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-carbon font-sans text-[0.55rem] uppercase tracking-widest text-stone">
              <div className="col-span-4">Investor</div>
              <div className="col-span-2">Plan</div>
              <div className="col-span-2 text-right">Amount</div>
              <div className="col-span-2">Next renewal</div>
              <div className="col-span-2">Action</div>
            </div>
            {active.map((s) => {
              const name = s.user.investorProfile
                ? `${s.user.investorProfile.firstName} ${s.user.investorProfile.lastName}`.trim()
                : s.user.email
              const appId = s.user.investorProfile?.application?.id
              const overdue = s.nextRenewalAt < now
              return (
                <div key={s.userId} className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-carbon/60 last:border-b-0 items-center">
                  <div className="col-span-4">
                    <p className="font-sans text-sm text-ivory">{name}</p>
                    <p className="font-sans text-[0.65rem] text-stone">{s.user.email}</p>
                  </div>
                  <div className="col-span-2 font-sans text-sm text-stone">
                    {BILLING_PERIOD_LABEL[s.billingPeriod as BillingPeriod]}
                  </div>
                  <div className="col-span-2 text-right font-sans text-sm text-ivory">{fmt(Number(s.amount))}</div>
                  <div className={`col-span-2 font-sans text-sm ${overdue ? 'text-red-400' : 'text-stone'}`}>
                    {fmtDate(s.nextRenewalAt)}{overdue && ' · overdue'}
                  </div>
                  <div className="col-span-2">
                    {appId && (
                      <Link href={`/admin/investors/${appId}`} className="font-sans text-[0.6rem] uppercase tracking-widest text-gold hover:text-ivory transition-colors">
                        Manage →
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {cancelled.length > 0 && (
        <section className="mb-12">
          <h2 className="font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-4">Cancelled (access ending soon)</h2>
          <ul className="space-y-2">
            {cancelled.map((s) => {
              const name = s.user.investorProfile
                ? `${s.user.investorProfile.firstName} ${s.user.investorProfile.lastName}`.trim()
                : s.user.email
              return (
                <li key={s.userId} className="font-sans text-xs text-stone border-l-2 border-stone/40 pl-3">
                  <strong>{name}</strong> · {BILLING_PERIOD_LABEL[s.billingPeriod as BillingPeriod]} · cancelled {fmtDate(s.cancelledAt)} · access until {fmtDate(s.nextRenewalAt)}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">Recent subscription invoices</h2>
        {recentInvoices.length === 0 ? (
          <p className="font-sans text-sm text-stone">No subscription invoices yet.</p>
        ) : (
          <ul className="space-y-2">
            {recentInvoices.map((i) => {
              const name = i.user.investorProfile
                ? `${i.user.investorProfile.firstName} ${i.user.investorProfile.lastName}`.trim()
                : i.user.email
              return (
                <li key={i.id} className="grid grid-cols-12 gap-4 px-1 font-sans text-xs items-center">
                  <a href={`/api/admin/invoices/${i.id}/pdf`} target="_blank" rel="noopener noreferrer" className="col-span-2 text-gold hover:underline">
                    {i.invoiceNumber}
                  </a>
                  <span className="col-span-3 text-ivory">{name}</span>
                  <span className="col-span-2 text-right text-ivory">{fmt(Number(i.amount))}</span>
                  <span className="col-span-2 text-stone">{fmtDate(i.issuedAt)}</span>
                  <span className={`col-span-3 text-[0.55rem] uppercase tracking-widest ${i.status === 'PAID' ? 'text-green-400' : i.status === 'VOID' ? 'text-stone/60' : 'text-gold'}`}>
                    {i.status}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
