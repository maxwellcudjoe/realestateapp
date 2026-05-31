import type { ParsedAttachment, ParsedEmail } from './types'

function parseAddressList(raw: string | null): Array<{ email: string; name: string | null }> {
  if (!raw) return []
  const parts: string[] = []
  let buf = ''
  let depth = 0
  let inQuote = false
  for (const c of raw) {
    if (c === '"') inQuote = !inQuote
    else if (!inQuote && (c === '<' || c === '(')) depth++
    else if (!inQuote && (c === '>' || c === ')')) depth--
    if (c === ',' && depth === 0 && !inQuote) {
      parts.push(buf)
      buf = ''
      continue
    }
    buf += c
  }
  if (buf.trim()) parts.push(buf)
  return parts
    .map(parseSingleAddress)
    .filter((x): x is { email: string; name: string | null } => x !== null)
}

function parseSingleAddress(raw: string): { email: string; name: string | null } | null {
  const s = raw.trim()
  if (!s) return null
  const angle = s.match(/^(.*)<([^>]+)>$/)
  if (angle) {
    const name = angle[1].trim().replace(/^"|"$/g, '').trim() || null
    return { email: angle[2].trim().toLowerCase(), name }
  }
  if (s.includes('@')) return { email: s.toLowerCase(), name: null }
  return null
}

function parseHeaders(raw: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of raw.split(/\r?\n/)) {
    const idx = line.indexOf(':')
    if (idx <= 0) continue
    const k = line.slice(0, idx).trim()
    const v = line.slice(idx + 1).trim()
    if (k) out[k] = v
  }
  return out
}

function headerValue(headers: Record<string, string>, name: string): string | null {
  const lower = name.toLowerCase()
  for (const [k, v] of Object.entries(headers)) if (k.toLowerCase() === lower) return v
  return null
}

export async function parseSendgridForm(form: FormData): Promise<ParsedEmail> {
  const headersRaw = (form.get('headers') as string | null) ?? ''
  const headers = parseHeaders(headersRaw)
  const messageId = headerValue(headers, 'Message-ID')
  if (!messageId) throw new Error('Missing Message-ID header')

  const inReplyTo = headerValue(headers, 'In-Reply-To')
  const referencesHeader = headerValue(headers, 'References')
  const references = referencesHeader ? referencesHeader.split(/\s+/).filter(Boolean) : []

  const fromRaw = (form.get('from') as string | null) ?? ''
  const fromParsed = parseSingleAddress(fromRaw)
  if (!fromParsed) throw new Error('Missing or invalid From header')

  const attachments: ParsedAttachment[] = []
  const count = Number(form.get('attachments') ?? 0)
  for (let i = 1; i <= count; i++) {
    const file = form.get(`attachment${i}`)
    if (file instanceof File) {
      attachments.push({
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        size: file.size,
        buffer: Buffer.from(await file.arrayBuffer()),
      })
    }
  }

  return {
    messageId,
    inReplyTo,
    references,
    from: fromParsed,
    to: parseAddressList(form.get('to') as string | null),
    cc: parseAddressList(form.get('cc') as string | null),
    subject: (form.get('subject') as string | null) ?? '',
    bodyText: (form.get('text') as string | null) ?? '',
    bodyHtml: (form.get('html') as string | null) ?? null,
    receivedAt: new Date(),
    attachments,
    rawHeaders: headers,
  }
}
