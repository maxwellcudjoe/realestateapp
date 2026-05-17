/**
 * SumSub API client. Used by the KycService implementation in kyc-provider.ts
 * and by the WebSDK access-token endpoint.
 *
 * SumSub auth: HMAC-SHA256 over `{timestamp}{method}{path}{body}`, signed with the
 * Secret Key. Sent in X-App-Access-Sig + X-App-Access-Ts + X-App-Token headers.
 *
 * Env vars (set in Azure SWA, never committed):
 *   SUMSUB_APP_TOKEN    — starts with sbx: for sandbox or prd: for production
 *   SUMSUB_SECRET_KEY
 *   SUMSUB_BASE_URL     — optional, defaults to https://api.sumsub.com
 *   SUMSUB_LEVEL_NAME   — optional, the Verification Level slug. Defaults to "basic-kyc-level".
 *   SUMSUB_WEBHOOK_SECRET — optional, for signed webhook verification
 */

import crypto from 'crypto'

const DEFAULT_BASE = 'https://api.sumsub.com'
const DEFAULT_LEVEL = 'basic-kyc-level'

export function sumsubConfigured(): boolean {
  return Boolean(process.env.SUMSUB_APP_TOKEN && process.env.SUMSUB_SECRET_KEY)
}

function buildSignature(secret: string, ts: number, method: string, path: string, body: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(`${ts}${method.toUpperCase()}${path}${body}`)
    .digest('hex')
}

interface SumSubRequest {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string  // e.g. '/resources/applicants'
  body?: unknown
  query?: Record<string, string | undefined>
}

export async function callSumSub<T>(req: SumSubRequest): Promise<T> {
  const token = process.env.SUMSUB_APP_TOKEN
  const secret = process.env.SUMSUB_SECRET_KEY
  if (!token || !secret) throw new Error('SumSub is not configured')

  const base = process.env.SUMSUB_BASE_URL || DEFAULT_BASE
  const qs = req.query
    ? '?' + Object.entries(req.query).filter(([, v]) => v != null).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&')
    : ''
  const fullPath = req.path + qs
  const bodyStr = req.body !== undefined ? JSON.stringify(req.body) : ''
  const ts = Math.floor(Date.now() / 1000)
  const sig = buildSignature(secret, ts, req.method, fullPath, bodyStr)

  const res = await fetch(base + fullPath, {
    method: req.method,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-App-Token': token,
      'X-App-Access-Sig': sig,
      'X-App-Access-Ts': String(ts),
    },
    body: bodyStr || undefined,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`SumSub ${req.method} ${req.path} failed (${res.status}): ${text}`)
  }
  return res.json() as Promise<T>
}

interface CreateApplicantResponse {
  id: string
  externalUserId: string
  reviewStatus?: string
}

/** Create a SumSub applicant tied to our internal user id. */
export async function createApplicant(externalUserId: string, info: { firstName: string; lastName: string; email: string; dob?: string | null }): Promise<CreateApplicantResponse> {
  const level = process.env.SUMSUB_LEVEL_NAME || DEFAULT_LEVEL
  return callSumSub<CreateApplicantResponse>({
    method: 'POST',
    path: '/resources/applicants',
    query: { levelName: level },
    body: {
      externalUserId,
      info: {
        firstName: info.firstName,
        lastName: info.lastName,
        ...(info.dob ? { dob: info.dob } : {}),
      },
      email: info.email,
    },
  })
}

interface ApplicantStatusResponse {
  reviewStatus: 'init' | 'pending' | 'prechecked' | 'queued' | 'completed' | 'onHold'
  reviewResult?: {
    reviewAnswer?: 'GREEN' | 'RED' | 'YELLOW'
    rejectLabels?: string[]
    reviewRejectType?: string
  }
}

/** Fetch the current review status for an applicant. */
export async function getApplicantStatus(applicantId: string): Promise<ApplicantStatusResponse> {
  return callSumSub<ApplicantStatusResponse>({
    method: 'GET',
    path: `/resources/applicants/${applicantId}/status`,
  })
}

interface AccessTokenResponse {
  token: string
  userId: string
}

/** Generate a short-lived WebSDK access token for the applicant's session. */
export async function getAccessToken(externalUserId: string, ttlSecs = 600): Promise<AccessTokenResponse> {
  const level = process.env.SUMSUB_LEVEL_NAME || DEFAULT_LEVEL
  return callSumSub<AccessTokenResponse>({
    method: 'POST',
    path: '/resources/accessTokens',
    query: { userId: externalUserId, levelName: level, ttlInSecs: String(ttlSecs) },
  })
}

/** Map SumSub review status → our KycCheck.status enum. */
export function mapSumSubStatus(s: ApplicantStatusResponse): 'PENDING' | 'CLEAR' | 'CONSIDER' | 'REJECTED' {
  if (s.reviewStatus !== 'completed') return 'PENDING'
  const answer = s.reviewResult?.reviewAnswer
  if (answer === 'GREEN') return 'CLEAR'
  if (answer === 'RED') return 'REJECTED'
  return 'CONSIDER'
}

/** Verify a SumSub webhook signature. SumSub signs the raw request body with
 *  HMAC-SHA1/256/512 (algorithm declared in X-Payload-Digest-Alg). */
export function verifyWebhookSignature(rawBody: string, signature: string, alg: string = 'HMAC_SHA256_HEX'): boolean {
  const secret = process.env.SUMSUB_WEBHOOK_SECRET
  if (!secret) return false
  const algoName = alg.includes('SHA512') ? 'sha512' : alg.includes('SHA1') ? 'sha1' : 'sha256'
  const expected = crypto.createHmac(algoName, secret).update(rawBody).digest('hex')
  // Constant-time compare
  if (expected.length !== signature.length) return false
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}
