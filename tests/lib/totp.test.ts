import { describe, it, expect } from 'vitest'
import { generate as otplibGenerate } from 'otplib'
import {
  generateTotpSecret,
  totpKeyUri,
  totpQrDataUrl,
  verifyTotpCode,
  generateRecoveryCodes,
  findMatchingRecoveryCode,
} from '@/lib/totp'

describe('TOTP helpers', () => {
  it('generates a valid secret', () => {
    const s = generateTotpSecret()
    expect(s.length).toBeGreaterThan(15)
    expect(s).toMatch(/^[A-Z2-7]+$/)
  })

  it('verifies a freshly-generated code', async () => {
    const secret = generateTotpSecret()
    const code = await otplibGenerate({ secret })
    expect(await verifyTotpCode(secret, code)).toBe(true)
  })

  it('rejects an incorrect code', async () => {
    const secret = generateTotpSecret()
    expect(await verifyTotpCode(secret, '000000')).toBe(false)
  })

  it('rejects malformed input', async () => {
    const secret = generateTotpSecret()
    expect(await verifyTotpCode(secret, 'abcdef')).toBe(false)
    expect(await verifyTotpCode(secret, '12345')).toBe(false)
    expect(await verifyTotpCode(secret, '1234567')).toBe(false)
  })

  it('tolerates whitespace in code input', async () => {
    const secret = generateTotpSecret()
    const code = await otplibGenerate({ secret })
    expect(await verifyTotpCode(secret, ` ${code.slice(0, 3)} ${code.slice(3)} `)).toBe(true)
  })

  it('produces a keyuri with the issuer', () => {
    const uri = totpKeyUri('user@example.com', generateTotpSecret())
    expect(uri).toContain('otpauth://totp/')
    expect(uri).toContain('issuer=R')
  })

  it('produces a PNG data URL for the QR code', async () => {
    const url = await totpQrDataUrl('user@example.com', generateTotpSecret())
    expect(url.startsWith('data:image/png;base64,')).toBe(true)
  })
})

describe('Recovery codes', () => {
  it('generates the requested number of codes in XXXXX-XXXXX format', async () => {
    const { plain, hashed } = await generateRecoveryCodes(10)
    expect(plain).toHaveLength(10)
    expect(hashed).toHaveLength(10)
    for (const c of plain) {
      expect(c).toMatch(/^[A-F0-9]{5}-[A-F0-9]{5}$/)
    }
  })

  it('findMatchingRecoveryCode finds a real match and returns id', async () => {
    const { plain, hashed } = await generateRecoveryCodes(3)
    const rows = hashed.map((codeHash, i) => ({ id: `r${i}`, codeHash }))
    const id = await findMatchingRecoveryCode(plain[1], rows)
    expect(id).toBe('r1')
  })

  it('findMatchingRecoveryCode returns null when nothing matches', async () => {
    const { hashed } = await generateRecoveryCodes(2)
    const rows = hashed.map((codeHash, i) => ({ id: `r${i}`, codeHash }))
    const id = await findMatchingRecoveryCode('AAAAA-AAAAA', rows)
    expect(id).toBeNull()
  })

  it('matches recovery codes case-insensitively', async () => {
    const { plain, hashed } = await generateRecoveryCodes(1)
    const rows = [{ id: 'r0', codeHash: hashed[0] }]
    const id = await findMatchingRecoveryCode(plain[0].toLowerCase(), rows)
    expect(id).toBe('r0')
  })
})
