import { escapeHtml } from '@/lib/html-escape'

export function leadConversionMagicLinkHtml(args: {
  leadName: string
  magicLinkUrl: string
  adminMessage?: string | null
}): string {
  const adminBlock = args.adminMessage
    ? `<p style="margin:16px 0;font-style:italic;color:#555;">${escapeHtml(args.adminMessage)}</p>`
    : ''
  return `<!doctype html><html><body style="font-family:Georgia,serif;color:#1a1a1a;max-width:560px;margin:0 auto;padding:32px;">
  <h2 style="margin-top:0;">Hello ${escapeHtml(args.leadName)},</h2>
  <p>We'd like to invite you to finish setting up your Rêve Bâtir investor account.</p>
  ${adminBlock}
  <p style="margin:24px 0;">
    <a href="${escapeHtml(args.magicLinkUrl)}" style="background:#1a1a1a;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;">Finish setting up my account</a>
  </p>
  <p style="font-size:13px;color:#666;">This link expires in 24 hours. If it has lapsed, ask us to send a new one.</p>
  <p style="font-size:13px;color:#666;">If you weren't expecting this email, you can safely ignore it — no account is created until you click the link and set a password.</p>
</body></html>`
}
