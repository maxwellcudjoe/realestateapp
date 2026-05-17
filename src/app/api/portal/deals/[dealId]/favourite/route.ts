import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/** Toggle favourite for the current user. POST to add, DELETE to remove. */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ dealId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { dealId } = await ctx.params

  // Only the owning investor can favourite (no admin starring)
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, application: { investorProfile: { userId: session.user.id } } },
    select: { id: true },
  })
  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

  await prisma.dealFavourite.upsert({
    where: { dealId_userId: { dealId, userId: session.user.id } },
    create: { dealId, userId: session.user.id },
    update: {},
  })
  return NextResponse.json({ success: true, favourited: true })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ dealId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { dealId } = await ctx.params
  await prisma.dealFavourite.deleteMany({ where: { dealId, userId: session.user.id } })
  return NextResponse.json({ success: true, favourited: false })
}
