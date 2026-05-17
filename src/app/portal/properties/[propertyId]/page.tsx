import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { propertyTypeLabel } from '@/lib/property'
import { PropertyEditForm } from '@/components/portal/PropertyEditForm'
import { PropertyDocumentRoom } from '@/components/portal/PropertyDocumentRoom'

export const dynamic = 'force-dynamic'

const fmt = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`

export default async function PortalPropertyDetailPage({ params }: { params: { propertyId: string } }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const property = await prisma.property.findFirst({
    where: { id: params.propertyId, userId: session.user.id },
  })
  if (!property) redirect('/portal/properties')

  const currentValue = Number(property.currentValueEstimate ?? property.purchasePrice)
  const equity = currentValue - Number(property.purchasePrice)

  return (
    <div>
      <Link href="/portal/properties" className="font-sans text-xs uppercase tracking-widest text-stone hover:text-gold transition-colors mb-4 inline-block">
        ← All properties
      </Link>
      <h1 className="font-serif text-3xl font-light text-ivory mb-2">{property.address}</h1>
      <p className="font-sans text-sm text-stone mb-8">
        {propertyTypeLabel(property.propertyType)}
        {property.bedrooms != null && ` · ${property.bedrooms}-bed`}
        {property.bathrooms != null && ` · ${property.bathrooms}-bath`}
        {' · '}Completed {property.completionDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-carbon border border-carbon mb-12">
        {[
          ['Purchase price', fmt(Number(property.purchasePrice))],
          ['Current value', fmt(currentValue)],
          ['Equity', `${equity >= 0 ? '+' : ''}${fmt(equity)}`],
          ['Monthly rent', property.monthlyRent != null ? `${fmt(Number(property.monthlyRent))}` : '—'],
        ].map(([label, value]) => (
          <div key={label} className="bg-obsidian p-5">
            <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone mb-1">{label}</p>
            <p className="font-serif text-xl text-ivory">{value}</p>
          </div>
        ))}
      </section>

      <section className="mb-12">
        <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">Property Details</p>
        <div className="border border-carbon p-5">
          <PropertyEditForm initial={{
            id: property.id,
            currentValueEstimate: property.currentValueEstimate ? Number(property.currentValueEstimate) : null,
            tenancyStatus: property.tenancyStatus,
            monthlyRent: property.monthlyRent ? Number(property.monthlyRent) : null,
            tenancyStart: property.tenancyStart?.toISOString() ?? null,
            tenancyEnd: property.tenancyEnd?.toISOString() ?? null,
            notes: property.notes,
          }} />
        </div>
      </section>

      <section className="mb-12">
        <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">Documents</p>
        <div className="border border-carbon p-5">
          <PropertyDocumentRoom propertyId={property.id} />
        </div>
      </section>
    </div>
  )
}
