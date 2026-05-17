export function verificationEmailHtml({
  firstName,
  verifyUrl,
}: {
  firstName: string
  verifyUrl: string
}) {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#f0e8d8;padding:40px">
      <h1 style="color:#c9a84c;font-size:24px;font-weight:300">Verify Your Email</h1>
      <p>Dear ${firstName},</p>
      <p>Thank you for registering with Rêve Bâtir Realty. Please confirm your email address to activate your investor account.</p>
      <p>Click the link below to verify. This link expires in <strong>24 hours</strong>.</p>
      <p style="margin:32px 0">
        <a href="${verifyUrl}" style="background:#c9a84c;color:#0a0a0a;text-decoration:none;padding:14px 28px;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase">
          Verify Email
        </a>
      </p>
      <p style="font-size:12px;color:#888">If the button above doesn't work, copy and paste this link into your browser:</p>
      <p style="font-size:12px;color:#888;word-break:break-all">${verifyUrl}</p>
      <p style="font-size:12px;color:#888">If you did not create an account, you can safely ignore this email.</p>
      <hr style="border:none;border-top:1px solid #1e1e1e;margin:24px 0"/>
      <p style="font-size:12px;color:#888">Rêve Bâtir Realty — Property Deal Sourcing</p>
    </div>
  `
}
