const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/**
 * Escape user-controlled text before interpolation into HTML email bodies or
 * any HTML-rendered context. React components escape automatically; raw
 * template strings (server-side email HTML, PDF templates) do not.
 *
 * Use this on every interpolation of admin- or investor-provided text in
 * email/PDF/HTML output to neutralise the self-XSS + email-client XSS surface
 * called out in audit findings H8 / M7.
 */
export function escapeHtml(value: string | null | undefined): string {
  if (value == null) return ''
  return String(value).replace(/[&<>"']/g, (c) => HTML_ENTITIES[c]!)
}
