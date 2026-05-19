import { describe, it, expect } from 'vitest'
import { escapeHtml } from '@/lib/html-escape'

describe('escapeHtml', () => {
  it('escapes the five HTML special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    )
    expect(escapeHtml("it's & </>")).toBe('it&#39;s &amp; &lt;/&gt;')
  })

  it('returns empty string for null / undefined', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
  })

  it('returns plain text unchanged', () => {
    expect(escapeHtml('Hello, world')).toBe('Hello, world')
  })

  it('coerces non-string values to string before escaping', () => {
    expect(escapeHtml(42 as unknown as string)).toBe('42')
  })

  it('escapes ampersand first to avoid double-encoding', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;')
  })
})
