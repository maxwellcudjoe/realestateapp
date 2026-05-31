import { describe, it, expect } from 'vitest'
import { parseSendgridForm } from '@/lib/inbound/parse'

function makeForm(
  fields: Record<string, string>,
  files: Array<{ name: string; filename: string; contentType: string; data: string }> = [],
): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.append(k, v)
  for (const f of files) fd.append(f.name, new File([f.data], f.filename, { type: f.contentType }))
  return fd
}

describe('parseSendgridForm', () => {
  it('parses the canonical SendGrid Inbound Parse payload', async () => {
    const fd = makeForm(
      {
        from: 'Holly Anderson <holly.anderson@lovelle.co.uk>',
        to: 'info@revebatir.co.uk',
        subject: 'RE: 16 Grimsby Road, Cleethorpes',
        text: 'Hello Leticia...',
        html: '<p>Hello Leticia...</p>',
        headers:
          'Message-ID: <lovelle-001@lovelle.co.uk>\r\nIn-Reply-To: <rb-001@revebatir.co.uk>\r\nReferences: <rb-001@revebatir.co.uk>\r\nList-Unsubscribe: <mailto:u@x>\r\n',
        attachments: '1',
      },
      [{ name: 'attachment1', filename: 'brochure.pdf', contentType: 'application/pdf', data: '%PDF-1.4 fake' }],
    )

    const parsed = await parseSendgridForm(fd)

    expect(parsed.from).toEqual({ email: 'holly.anderson@lovelle.co.uk', name: 'Holly Anderson' })
    expect(parsed.to).toEqual([{ email: 'info@revebatir.co.uk', name: null }])
    expect(parsed.subject).toBe('RE: 16 Grimsby Road, Cleethorpes')
    expect(parsed.bodyText).toBe('Hello Leticia...')
    expect(parsed.bodyHtml).toBe('<p>Hello Leticia...</p>')
    expect(parsed.messageId).toBe('<lovelle-001@lovelle.co.uk>')
    expect(parsed.inReplyTo).toBe('<rb-001@revebatir.co.uk>')
    expect(parsed.references).toEqual(['<rb-001@revebatir.co.uk>'])
    expect(parsed.rawHeaders['List-Unsubscribe']).toBe('<mailto:u@x>')
    expect(parsed.attachments).toHaveLength(1)
    expect(parsed.attachments[0]).toMatchObject({ filename: 'brochure.pdf', contentType: 'application/pdf' })
    expect(parsed.attachments[0].buffer).toBeInstanceOf(Buffer)
  })

  it('handles bare email "from" with no display name', async () => {
    const fd = makeForm({
      from: 'lexi@ddmresidential.co.uk',
      to: 'info@revebatir.co.uk',
      subject: 's',
      text: 't',
      headers: 'Message-ID: <a>\r\n',
    })
    const parsed = await parseSendgridForm(fd)
    expect(parsed.from).toEqual({ email: 'lexi@ddmresidential.co.uk', name: null })
  })

  it('parses multiple recipients and cc', async () => {
    const fd = makeForm({
      from: 'a@b.com',
      to: 'one@x.com, "Two Person" <two@x.com>',
      cc: 'cc@x.com',
      subject: 's',
      text: 't',
      headers: 'Message-ID: <a>\r\n',
    })
    const parsed = await parseSendgridForm(fd)
    expect(parsed.to).toEqual([
      { email: 'one@x.com', name: null },
      { email: 'two@x.com', name: 'Two Person' },
    ])
    expect(parsed.cc).toEqual([{ email: 'cc@x.com', name: null }])
  })

  it('parses space-separated References into an array', async () => {
    const fd = makeForm({
      from: 'a@b.com',
      to: 'x@y.com',
      subject: 's',
      text: 't',
      headers: 'Message-ID: <new@x>\r\nReferences: <a@x> <b@x>\t<c@x>\r\n',
    })
    const parsed = await parseSendgridForm(fd)
    expect(parsed.references).toEqual(['<a@x>', '<b@x>', '<c@x>'])
  })

  it('throws on missing Message-ID header', async () => {
    const fd = makeForm({ from: 'a@b.com', to: 'x@y.com', subject: 's', text: 't', headers: '' })
    await expect(parseSendgridForm(fd)).rejects.toThrow(/Message-ID/i)
  })

  it('throws on missing/invalid From header', async () => {
    const fd = makeForm({ from: '', to: 'x@y.com', subject: 's', text: 't', headers: 'Message-ID: <a>\r\n' })
    await expect(parseSendgridForm(fd)).rejects.toThrow(/From/i)
  })
})
