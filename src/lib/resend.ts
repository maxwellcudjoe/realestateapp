import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  return resend.emails.send({
    from: 'Dream Build Property Group <noreply@dreambuildproperty.co.uk>',
    to,
    subject,
    html,
  })
}
