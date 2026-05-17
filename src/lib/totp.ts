import { generateSecret, verify, generateURI } from 'otplib'
import QRCode from 'qrcode'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const ISSUER = 'Rêve Bâtir Realty'
// Tolerate ±30s of clock drift between client and server (one TOTP step)
const TOLERANCE_SECONDS = 30

export function generateTotpSecret(): string {
  return generateSecret()
}

export function totpKeyUri(email: string, secret: string): string {
  return generateURI({ issuer: ISSUER, label: email, secret })
}

export async function totpQrDataUrl(email: string, secret: string): Promise<string> {
  const uri = totpKeyUri(email, secret)
  return QRCode.toDataURL(uri, { errorCorrectionLevel: 'M', margin: 1, width: 240 })
}

export async function verifyTotpCode(secret: string, code: string): Promise<boolean> {
  const clean = code.replace(/\s+/g, '')
  if (!/^\d{6}$/.test(clean)) return false
  try {
    const result = await verify({ secret, token: clean, epochTolerance: TOLERANCE_SECONDS })
    return Boolean(result?.valid)
  } catch {
    return false
  }
}

/**
 * Generate N random recovery codes in the format XXXXX-XXXXX.
 * Returns both the plain codes (shown ONCE) and their bcrypt hashes (stored).
 */
export async function generateRecoveryCodes(n = 10): Promise<{ plain: string[]; hashed: string[] }> {
  const plain: string[] = []
  const hashed: string[] = []
  for (let i = 0; i < n; i++) {
    const raw = crypto.randomBytes(5).toString('hex').toUpperCase()
    const formatted = `${raw.slice(0, 5)}-${raw.slice(5)}`
    plain.push(formatted)
    hashed.push(await bcrypt.hash(formatted, 10))
  }
  return { plain, hashed }
}

/** Returns the matching codeId if one of the hashes matches, otherwise null. */
export async function findMatchingRecoveryCode(
  candidate: string,
  rows: { id: string; codeHash: string }[],
): Promise<string | null> {
  const clean = candidate.trim().toUpperCase()
  for (const row of rows) {
    if (await bcrypt.compare(clean, row.codeHash)) return row.id
  }
  return null
}
