import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/inbound/persist', () => ({
  persist: vi.fn(),
}))

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

  it('200 with query-param secret when no Authorization header', async () => {
    const { POST } = await import('@/app/api/inbound/email/route')
    const req = new Request('http://localhost/api/inbound/email?secret=test-secret', {
      method: 'POST',
      body: dealerForm(),
      // no Authorization header
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('401 with wrong query-param secret', async () => {
    const { POST } = await import('@/app/api/inbound/email/route')
    const req = new Request('http://localhost/api/inbound/email?secret=wrong', {
      method: 'POST',
      body: dealerForm(),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('ignores query secret when Authorization header is present (header wins)', async () => {
    const { POST } = await import('@/app/api/inbound/email/route')
    // Right query-secret but wrong Bearer → 401 (header takes precedence)
    const req = new Request('http://localhost/api/inbound/email?secret=test-secret', {
      method: 'POST',
      body: dealerForm(),
      headers: { Authorization: 'Bearer wrong' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('500 when INBOUND_SECRET not configured', async () => {
    delete process.env.INBOUND_SECRET
    const { POST } = await import('@/app/api/inbound/email/route')
    const res = await POST(makeRequest(dealerForm()))
    expect(res.status).toBe(500)
  })
})

import * as persistModule from '@/lib/inbound/persist'

describe('POST /api/inbound/email (persist mode)', () => {
  beforeEach(() => {
    process.env.INBOUND_DRY_RUN = 'false'
    process.env.INBOUND_BLOB_CONTAINER = 'dealer-correspondence'
    ;(persistModule.persist as ReturnType<typeof vi.fn>).mockReset()
  })

  it('returns persisted:true with metadata on KEPT email', async () => {
    ;(persistModule.persist as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      emailId: 'email-1',
      threadId: 'thread-1',
      dealId: 'deal-1',
      classification: 'KEPT',
      direction: 'INBOUND',
      duplicate: false,
    })
    const { POST } = await import('@/app/api/inbound/email/route')
    const res = await POST(makeRequest(dealerForm()))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toMatchObject({
      ok: true,
      persisted: true,
      duplicate: false,
      emailId: 'email-1',
      threadId: 'thread-1',
      dealId: 'deal-1',
      classification: 'KEPT',
      direction: 'INBOUND',
    })
    expect(persistModule.persist).toHaveBeenCalledTimes(1)
  })

  it('returns duplicate:true and persisted:false on duplicate Message-ID', async () => {
    ;(persistModule.persist as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      emailId: 'existing-id',
      threadId: null,
      dealId: null,
      classification: 'KEPT',
      direction: 'INBOUND',
      duplicate: true,
    })
    const { POST } = await import('@/app/api/inbound/email/route')
    const res = await POST(makeRequest(dealerForm()))
    const json = await res.json()
    expect(json.duplicate).toBe(true)
    expect(json.persisted).toBe(false)
  })

  it('returns 500 when persist throws', async () => {
    ;(persistModule.persist as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('db down'))
    const { POST } = await import('@/app/api/inbound/email/route')
    const res = await POST(makeRequest(dealerForm()))
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json).toMatchObject({ ok: false, error: 'persist_failed' })
  })

  it('does NOT call persist in dry-run mode', async () => {
    process.env.INBOUND_DRY_RUN = 'true'
    const { POST } = await import('@/app/api/inbound/email/route')
    const res = await POST(makeRequest(dealerForm()))
    const json = await res.json()
    expect(json.dryRun).toBe(true)
    expect(persistModule.persist).not.toHaveBeenCalled()
  })
})
