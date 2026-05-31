import { NextResponse } from 'next/server'
import { parseSendgridForm } from '@/lib/inbound/parse'
import { classify } from '@/lib/inbound/classify'
import { detectDirection } from '@/lib/inbound/direction'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BYTES = 25 * 1024 * 1024

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.INBOUND_SECRET
  if (!secret) return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 500 })

  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const contentLength = Number(req.headers.get('content-length') ?? 0)
  if (contentLength > MAX_BYTES) return NextResponse.json({ ok: false, error: 'too_large' }, { status: 413 })

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_form' }, { status: 400 })
  }

  let parsed
  try {
    parsed = await parseSendgridForm(form)
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'parse_failed', detail: (e as Error).message }, { status: 200 })
  }

  const classification = classify(parsed)
  const { direction, attributedUserEmail } = detectDirection(parsed, process.env.INTERNAL_DOMAINS ?? '')

  if (process.env.INBOUND_DRY_RUN === 'true') {
    console.log('[inbound:dry-run]', {
      messageId: parsed.messageId,
      from: parsed.from.email,
      subject: parsed.subject,
      classification,
      direction,
    })
    return NextResponse.json({
      ok: true,
      dryRun: true,
      messageId: parsed.messageId,
      classification,
      direction,
      attributedUserEmail,
    })
  }

  // Task 10 will replace this with persist()
  return NextResponse.json({ ok: true, dryRun: false, classification, direction, persisted: false })
}
