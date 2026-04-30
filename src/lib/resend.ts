import { Resend } from 'resend'

let cachedClient: Resend | null = null

function getClient(): Resend {
  if (cachedClient) return cachedClient
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }
  cachedClient = new Resend(apiKey)
  return cachedClient
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  return getClient().emails.send({
    from: 'Rêve Bâtir Wealth Ltd <noreply@revebatirwealth.co.uk>',
    to,
    subject,
    html,
  })
}
