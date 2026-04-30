import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/resend', () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: 'mock-id' }),
}))

async function getHandler() {
  const mod = await import('@/app/api/contact/route')
  return mod.POST
}

const VALID_BODY = {
  name: 'Alex Turner',
  email: 'alex@example.com',
  message: 'Interested in the Manchester deal.',
}

describe('POST /api/contact', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 200 and success:true with valid data', async () => {
    const POST = await getHandler()
    const req = new Request('http://localhost/api/contact', {
      method: 'POST',
      body: JSON.stringify(VALID_BODY),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it('returns 400 when message is empty', async () => {
    const POST = await getHandler()
    const req = new Request('http://localhost/api/contact', {
      method: 'POST',
      body: JSON.stringify({ ...VALID_BODY, message: '' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })

  it('calls sendEmail twice (owner + auto-reply)', async () => {
    const { sendEmail } = await import('@/lib/resend')
    const POST = await getHandler()
    const req = new Request('http://localhost/api/contact', {
      method: 'POST',
      body: JSON.stringify(VALID_BODY),
      headers: { 'Content-Type': 'application/json' },
    })
    await POST(req as any)
    expect(vi.mocked(sendEmail)).toHaveBeenCalledTimes(2)
  })

  it('returns 500 when sendEmail throws', async () => {
    const { sendEmail } = await import('@/lib/resend')
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error('Resend down'))
    const POST = await getHandler()
    const req = new Request('http://localhost/api/contact', {
      method: 'POST',
      body: JSON.stringify(VALID_BODY),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(500)
  })
})
