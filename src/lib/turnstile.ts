// Cloudflare Turnstile server-side verification.
// Graceful fallback: if TURNSTILE_SECRET_KEY isn't set, returns ok=true
// and logs a warning — keeps prod working while keys are being provisioned.

const VERIFY_ENDPOINT = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export interface TurnstileResult {
  ok: boolean
  reason?: string
}

export async function verifyTurnstile(token: string | undefined | null, ip?: string): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY

  if (!secret) {
    console.warn('[turnstile] TURNSTILE_SECRET_KEY not set — skipping CAPTCHA verification.')
    return { ok: true, reason: 'not-configured' }
  }

  if (!token) {
    return { ok: false, reason: 'missing-token' }
  }

  const body = new URLSearchParams()
  body.set('secret', secret)
  body.set('response', token)
  if (ip) body.set('remoteip', ip)

  try {
    const res = await fetch(VERIFY_ENDPOINT, {
      method: 'POST',
      body,
    })
    const data = (await res.json()) as { success: boolean; 'error-codes'?: string[] }
    if (!data.success) {
      return { ok: false, reason: data['error-codes']?.join(',') ?? 'verify-failed' }
    }
    return { ok: true }
  } catch (e) {
    console.error('[turnstile] verify call failed:', e)
    return { ok: false, reason: 'network-error' }
  }
}
