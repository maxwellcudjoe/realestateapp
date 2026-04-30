import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/resend', () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: 'mock-id' }),
}))

// Lazy import after mock is set up
async function getHandler() {
  const mod = await import('@/app/api/register/route')
  return mod.POST
}

const VALID_BODY = {
  name: 'Jane Smith',
  email: 'jane@example.com',
  phone: '+44 7700 000000',
  budget: '£150,000–£300,000',
  strategy: 'BTL',
  buyerType: 'Cash',
  areas: 'Manchester, Leeds',
}

describe('POST /api/register', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 200 and success:true with valid data', async () => {
    const POST = await getHandler()
    const req = new Request('http://localhost/api/register', {
      method: 'POST',
      body: JSON.stringify(VALID_BODY),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it('returns 400 when email is invalid', async () => {
    const POST = await getHandler()
    const req = new Request('http://localhost/api/register', {
      method: 'POST',
      body: JSON.stringify({ ...VALID_BODY, email: 'not-an-email' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.errors.email).toBeDefined()
  })

  it('returns 400 when required fields are missing', async () => {
    const POST = await getHandler()
    const req = new Request('http://localhost/api/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Jane' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })

  it('returns 500 when sendEmail throws', async () => {
    const { sendEmail } = await import('@/lib/resend')
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error('Resend down'))

    const POST = await getHandler()
    const req = new Request('http://localhost/api/register', {
      method: 'POST',
      body: JSON.stringify(VALID_BODY),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBe('Failed to send — please try again.')
  })
})
