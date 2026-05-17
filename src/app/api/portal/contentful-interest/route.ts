import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { z } from 'zod'

const schema = z.object({
  contentfulEntryId: z.string().min(1).max(64),
  title: z.string().max(255).optional().default(''),
  slug: z.string().max(255).optional().default(''),
  note: z.string().max(1000).optional().default(''),
})

/** Logged-in investor saves a public Contentful deal to their portal. Admin sees the
 *  interest and can promote it to a real Deal row by visiting /admin/match. */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  // Upsert (no-op if already saved)
  const existed = await prisma.contentfulDealInterest.findUnique({
    where: { userId_contentfulEntryId: { userId: session.user.id, contentfulEntryId: parsed.data.contentfulEntryId } },
    select: { id: true },
  })

  await prisma.contentfulDealInterest.upsert({
    where: { userId_contentfulEntryId: { userId: session.user.id, contentfulEntryId: parsed.data.contentfulEntryId } },
    create: {
      userId: session.user.id,
      contentfulEntryId: parsed.data.contentfulEntryId,
      title: parsed.data.title || null,
      slug: parsed.data.slug || null,
      note: parsed.data.note || null,
    },
    update: { note: parsed.data.note || null },
  })

  // Notify admin on the first save only — repeat clicks are noisy
  if (!existed) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { investorProfile: { select: { firstName: true, lastName: true } } },
      })
      const name = user?.investorProfile ? `${user.investorProfile.firstName} ${user.investorProfile.lastName}` : user?.email
      await sendEmail({
        to: process.env.RESEND_TO_EMAIL!,
        subject: `Public deal interest — ${name}`,
        html: `<p><strong>${name}</strong> saved a public deal: <strong>${parsed.data.title || parsed.data.contentfulEntryId}</strong></p>
               ${parsed.data.note ? `<p style="border-left:2px solid #c9a84c;padding-left:16px"><em>${parsed.data.note}</em></p>` : ''}
               <p>Promote it to a real Deal row from <a href="${process.env.NEXTAUTH_URL}/admin/match">/admin/match</a>.</p>`,
      })
    } catch (e) {
      console.error('Contentful interest email failed (non-fatal):', e)
    }
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const entryId = req.nextUrl.searchParams.get('entryId')
  if (!entryId) return NextResponse.json({ error: 'entryId required' }, { status: 400 })

  await prisma.contentfulDealInterest.deleteMany({
    where: { userId: session.user.id, contentfulEntryId: entryId },
  })
  return NextResponse.json({ success: true })
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ entries: [] })

  const entries = await prisma.contentfulDealInterest.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      contentfulEntryId: e.contentfulEntryId,
      title: e.title,
      slug: e.slug,
      createdAt: e.createdAt.toISOString(),
    })),
  })
}
