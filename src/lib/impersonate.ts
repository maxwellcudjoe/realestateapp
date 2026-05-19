/**
 * Signed-cookie helpers for admin impersonation.
 *
 * Cookie name: __impersonate
 * Cookie value: <base64url(json-payload)>.<base64url(hmac-sha256 sig)>
 * Payload: { adminId, targetUserId, issuedAt, expiresAt }
 *
 * Signature is HMAC-SHA256 over the base64url(payload) using NEXTAUTH_SECRET.
 * All helpers are written with Web Crypto APIs (subtle.crypto) so they work
 * in both edge runtime (middleware) and Node (auth.ts session callback).
 */

export const IMPERSONATE_COOKIE = '__impersonate'
export const IMPERSONATE_TTL_MS = 30 * 60 * 1000   // 30 minutes

export interface ImpersonatePayload {
  adminId: string
  targetUserId: string
  issuedAt: number
  expiresAt: number
}

function b64urlEncode(bytes: Uint8Array): string {
  let str = ''
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i])
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (str.length % 4)) % 4)
  const bin = atob(padded)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

async function sign(secret: string, message: string): Promise<string> {
  const key = await importKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message) as BufferSource)
  return b64urlEncode(new Uint8Array(sig))
}

async function verifySig(secret: string, message: string, signature: string): Promise<boolean> {
  const key = await importKey(secret)
  try {
    return await crypto.subtle.verify(
      'HMAC',
      key,
      b64urlDecode(signature) as BufferSource,
      new TextEncoder().encode(message) as BufferSource,
    )
  } catch {
    return false
  }
}

/**
 * Build a signed cookie value for a new impersonation session. Returns the
 * full payload alongside the cookie string so the caller can record both.
 */
export async function signImpersonateCookie(
  secret: string,
  adminId: string,
  targetUserId: string,
  now: Date = new Date(),
): Promise<{ value: string; payload: ImpersonatePayload }> {
  const payload: ImpersonatePayload = {
    adminId,
    targetUserId,
    issuedAt: now.getTime(),
    expiresAt: now.getTime() + IMPERSONATE_TTL_MS,
  }
  const encoded = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)))
  const signature = await sign(secret, encoded)
  return { value: `${encoded}.${signature}`, payload }
}

/**
 * Verify a cookie value and return the payload if valid + unexpired. Returns
 * null on any failure (malformed, bad signature, expired).
 */
export async function verifyImpersonateCookie(
  secret: string,
  cookieValue: string | undefined | null,
  now: Date = new Date(),
): Promise<ImpersonatePayload | null> {
  if (!cookieValue) return null
  const dotIdx = cookieValue.indexOf('.')
  if (dotIdx === -1) return null
  const encoded = cookieValue.slice(0, dotIdx)
  const signature = cookieValue.slice(dotIdx + 1)
  const sigOk = await verifySig(secret, encoded, signature)
  if (!sigOk) return null
  let payload: ImpersonatePayload
  try {
    payload = JSON.parse(new TextDecoder().decode(b64urlDecode(encoded))) as ImpersonatePayload
  } catch {
    return null
  }
  if (typeof payload.expiresAt !== 'number' || payload.expiresAt < now.getTime()) return null
  if (!payload.adminId || !payload.targetUserId) return null
  return payload
}

/**
 * HTTP methods that should be blocked during impersonation (read-only mode).
 */
export const MUTATION_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE'])

/**
 * Returns true when the method+path combination must be blocked during
 * impersonation. The stop endpoint must always be reachable.
 */
export function isBlockedDuringImpersonation(method: string, pathname: string): boolean {
  if (!MUTATION_METHODS.has(method.toUpperCase())) return false
  if (!pathname.startsWith('/api/')) return false
  // The exit endpoint must always be reachable so the admin can leave.
  if (/^\/api\/admin\/users\/[^/]+\/impersonate$/.test(pathname)) return false
  return true
}
