import { randomBytes } from 'crypto'

export const TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24h

export function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

export interface TokenRow {
  usedAt: Date | null
  expiresAt: Date
}

export function isTokenValid(row: TokenRow, now: Date = new Date()): boolean {
  if (row.usedAt !== null) return false
  if (row.expiresAt.getTime() <= now.getTime()) return false
  return true
}
