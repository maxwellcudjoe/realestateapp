import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

/**
 * UK postcode → address list lookup. Server-side proxy so the API key never leaves the server.
 *
 * Supports getaddress.io out of the box. To activate:
 *   1. Sign up at https://getaddress.io
 *   2. Set GETADDRESS_API_KEY in Azure Static Web Apps config
 *
 * Graceful fallback: if the key isn't set, returns 503 — the client falls back to manual entry.
 * Auth-gated (logged-in users only) to prevent the endpoint from being scraped.
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const postcode = req.nextUrl.searchParams.get('postcode')?.trim().replace(/\s+/g, '')
  if (!postcode || !/^[A-Z]{1,2}\d{1,2}[A-Z]?\d[A-Z]{2}$/i.test(postcode)) {
    return NextResponse.json({ error: 'Invalid UK postcode' }, { status: 400 })
  }

  const key = process.env.GETADDRESS_API_KEY
  if (!key) {
    return NextResponse.json({ error: 'Address lookup not configured.', configured: false }, { status: 503 })
  }

  try {
    const res = await fetch(`https://api.getAddress.io/find/${encodeURIComponent(postcode)}?api-key=${key}&expand=true`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return NextResponse.json({ error: text || 'Lookup failed' }, { status: res.status })
    }
    const data = await res.json()
    // Normalise — return a flat list of { line1, town, postcode } for the picker
    const addresses: Array<{ line1: string; line2?: string; town: string; postcode: string; raw: string }> =
      (data.addresses ?? []).map((a: { line_1?: string; line_2?: string; town_or_city?: string; formatted_address?: string[] }) => ({
        line1: a.line_1 ?? '',
        line2: a.line_2 ?? undefined,
        town: a.town_or_city ?? '',
        postcode: data.postcode ?? postcode.toUpperCase(),
        raw: Array.isArray(a.formatted_address) ? a.formatted_address.filter(Boolean).join(', ') : '',
      }))
    return NextResponse.json({ addresses, postcode: data.postcode ?? postcode.toUpperCase() })
  } catch (e) {
    console.error('[postcode-lookup] failed:', e)
    return NextResponse.json({ error: 'Lookup service unavailable' }, { status: 502 })
  }
}
