// Password strength + HIBP "Pwned Passwords" k-anonymity check.
// The full password never leaves the server — only the first 5 chars of its
// SHA-1 hash are sent to the HIBP API.

import crypto from 'crypto'

const HIBP_ENDPOINT = 'https://api.pwnedpasswords.com/range/'

const COMPLEXITY_RULES = [
  { test: (p: string) => p.length >= 8, message: 'be at least 8 characters' },
  { test: (p: string) => /[a-z]/.test(p), message: 'include a lowercase letter' },
  { test: (p: string) => /[A-Z]/.test(p), message: 'include an uppercase letter' },
  { test: (p: string) => /\d/.test(p), message: 'include a number' },
  { test: (p: string) => /[^A-Za-z0-9]/.test(p), message: 'include a symbol' },
]

export interface PasswordCheckResult {
  ok: boolean
  errors: string[]
}

/** Pure validation — runs on client and server. No network calls. */
export function checkPasswordComplexity(password: string): PasswordCheckResult {
  const errors = COMPLEXITY_RULES
    .filter((r) => !r.test(password))
    .map((r) => `Password must ${r.message}.`)
  return { ok: errors.length === 0, errors }
}

/** Rough 0–4 strength score for the meter. */
export function passwordStrength(password: string): number {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++
  return Math.min(score, 4)
}

/**
 * Check the Have-I-Been-Pwned k-anonymity API.
 * Sends only the first 5 hex chars of SHA-1(password); never the password itself.
 * Returns `{ pwned: true, count }` if the password has appeared in any breach.
 *
 * Network-fail safe: returns { pwned: false } if the API call fails, so users
 * are not blocked by an outage. The complexity check is the real gate.
 */
export async function checkPasswordBreached(password: string): Promise<{ pwned: boolean; count: number }> {
  const hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase()
  const prefix = hash.slice(0, 5)
  const suffix = hash.slice(5)

  try {
    const res = await fetch(`${HIBP_ENDPOINT}${prefix}`, {
      headers: { 'Add-Padding': 'true' },
    })
    if (!res.ok) return { pwned: false, count: 0 }
    const text = await res.text()
    for (const line of text.split('\n')) {
      const [hashSuffix, countStr] = line.split(':')
      if (hashSuffix.trim() === suffix) {
        return { pwned: true, count: parseInt(countStr, 10) || 0 }
      }
    }
    return { pwned: false, count: 0 }
  } catch {
    return { pwned: false, count: 0 }
  }
}
