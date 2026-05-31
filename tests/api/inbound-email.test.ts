import { describe, it, expect, beforeEach, vi } from 'vitest'

const envBackup = { ...process.env }
beforeEach(() => {
  process.env = {
    ...envBackup,
    INBOUND_SECRET: 'test-secret',
    INTERNAL_DOMAINS: 'revebatir.co.uk',
    INBOUND_DRY_RUN: 'true',
  }
  vi.resetModules()
})

function makeRequest(body: FormData, auth: string | null = 'Bearer test-secret'): Request {
  const headers: Record<string, string> = {}
  if (auth) headers['Authorization'] = auth
  return new Request('http://localhost/api/inbound/email', { method: 'POST', body, headers })
}

function dealerForm(): FormData {
  const fd = new FormData()
  fd.append('from', 'Holly Anderson <holly.anderson@lovelle.co.uk>')
  fd.append('to', 'info@revebatir.co.uk')
  fd.append('subject', 'RE: 16 Grimsby Road, Cleethorpes')
  fd.append('text', 'Hello Leticia...')
  fd.append('headers', 'Message-ID: <lovelle-001@lovelle.co.uk>\r\n')
  fd.append('attachments', '0')
  return fd
}

describe('POST /api/inbound/email (dry-run)', () => {
  it('401 without bearer', async () => {
    const { POST } = await import('@/app/api/inbound/email/route')
    const res = await POST(makeRequest(dealerForm(), null))
    expect(res.status).toBe(401)
  })

  it('401 with wrong bearer', async () => {
    const { POST } = await import('@/app/api/inbound/email/route')
    const res = await POST(makeRequest(dealerForm(), 'Bearer nope'))
    expect(res.status).toBe(401)
  })

  it('200 with dryRun:true classification for KEPT mail', async () => {
    const { POST } = await import('@/app/api/inbound/email/route')
    const res = await POST(makeRequest(dealerForm()))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toMatchObject({ ok: true, dryRun: true, classification: 'KEPT', direction: 'INBOUND' })
  })

  it('200 with classification DROPPED_MARKETING for facebook mail', async () => {
    const fd = dealerForm()
    fd.set('from', 'notification@facebookmail.com')
    const { POST } = await import('@/app/api/inbound/email/route')
    const res = await POST(makeRequest(fd))
    const json = await res.json()
    expect(json.classification).toBe('DROPPED_MARKETING')
  })

  it('500 when INBOUND_SECRET not configured', async () => {
    delete process.env.INBOUND_SECRET
    const { POST } = await import('@/app/api/inbound/email/route')
    const res = await POST(makeRequest(dealerForm()))
    expect(res.status).toBe(500)
  })
})
