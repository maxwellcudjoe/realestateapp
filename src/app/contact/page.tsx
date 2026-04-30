'use client'

import { useState } from 'react'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { Button } from '@/components/ui/Button'

const FIELD_CLASS =
  'w-full bg-[#0e0e0e] border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold transition-colors'

const LABEL_CLASS =
  'block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [serverError, setServerError] = useState('')

  function update(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrors({})
    setServerError('')

    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const json = await res.json()

    if (!res.ok) {
      if (json.errors) setErrors(json.errors)
      else setServerError(json.error ?? 'Something went wrong.')
      setStatus('error')
    } else {
      setStatus('success')
    }
  }

  return (
    <div className="min-h-screen bg-obsidian pt-[72px]">
      <div className="max-w-7xl mx-auto px-8 py-16">
        <SectionLabel className="mb-4">Get In Touch</SectionLabel>
        <h1 className="font-serif text-5xl font-light text-ivory mb-16">Contact Us</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          {/* Contact info */}
          <div className="flex flex-col gap-8">
            <div>
              <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-2">Email</p>
              <a
                href="mailto:hello@dreambuildproperty.co.uk"
                className="font-sans text-sm text-stone hover:text-ivory transition-colors"
              >
                hello@dreambuildproperty.co.uk
              </a>
            </div>
            <div>
              <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-2">Phone</p>
              <a
                href="tel:+447700000000"
                className="font-sans text-sm text-stone hover:text-ivory transition-colors"
              >
                +44 7700 000 000
              </a>
            </div>
            <div>
              <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-2">LinkedIn</p>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-sans text-sm text-stone hover:text-ivory transition-colors"
              >
                Dream Build Property Group
              </a>
            </div>

            <div className="border-l-2 border-gold/30 pl-5 mt-4">
              <p className="font-serif text-base font-light italic text-stone leading-relaxed">
                "We respond to all enquiries within 24 hours. For urgent deal enquiries, please call directly."
              </p>
            </div>
          </div>

          {/* Form */}
          <div>
            {status === 'success' ? (
              <p className="font-serif text-2xl font-light text-gold">
                Message sent. We'll be in touch within 24 hours.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div>
                  <label className={LABEL_CLASS}>Name</label>
                  <input type="text" required value={form.name} onChange={update('name')} className={FIELD_CLASS} placeholder="Your name" />
                  {errors.name && <p className="font-sans text-xs text-gold mt-1">{errors.name[0]}</p>}
                </div>
                <div>
                  <label className={LABEL_CLASS}>Email</label>
                  <input type="email" required value={form.email} onChange={update('email')} className={FIELD_CLASS} placeholder="your@email.com" />
                  {errors.email && <p className="font-sans text-xs text-gold mt-1">{errors.email[0]}</p>}
                </div>
                <div>
                  <label className={LABEL_CLASS}>Message</label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={update('message')}
                    className={`${FIELD_CLASS} resize-none`}
                    placeholder="How can we help?"
                  />
                  {errors.message && <p className="font-sans text-xs text-gold mt-1">{errors.message[0]}</p>}
                </div>
                {serverError && (
                  <p className="font-sans text-xs text-red-400">{serverError}</p>
                )}
                <Button type="submit" fullWidth disabled={status === 'loading'} className="mt-2 py-4">
                  {status === 'loading' ? 'Sending…' : 'Send Enquiry'}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
