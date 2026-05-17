import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ notifications: [], unreadCount: 0 })

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10) || 20, 100)
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.notification.count({ where: { userId: session.user.id, readAt: null } }),
  ])
  return NextResponse.json({
    unreadCount,
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    })),
  })
}

export async function POST() {
  // Mark all unread as read
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  await prisma.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: now },
  })
  return NextResponse.json({ success: true })
}
