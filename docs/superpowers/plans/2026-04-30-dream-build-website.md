# Dream Build Property Group — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 5-page luxury property investment website for Dream Build Property Group using Next.js 14 App Router, Tailwind CSS, Contentful CMS, and Resend email.

**Architecture:** Server Components fetch Contentful deals at request time with 60s ISR revalidation; Client Components handle scroll-aware nav, filter URL state, and modals; two Next.js API routes handle form submissions validated with Zod and dispatched via Resend.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Contentful SDK, Resend, Zod, Vitest

---

## File Map

```
src/
  app/
    layout.tsx                    ← Root layout: fonts, Navbar, Footer
    page.tsx                      ← Home (Server Component)
    about/page.tsx
    deals/page.tsx                ← Reads searchParams.strategy
    register/page.tsx
    contact/page.tsx
    not-found.tsx
    globals.css
    api/
      register/route.ts
      contact/route.ts
  components/
    layout/
      Navbar.tsx                  ← Client Component (scroll state)
      Footer.tsx
    home/
      Hero.tsx
      WhatWeDo.tsx
      WhyDreamBuild.tsx
      HowItWorks.tsx
      FeaturedDeal.tsx            ← Accepts Deal | null prop
      Testimonials.tsx            ← Static/hardcoded
      CtaBanner.tsx
    deals/
      DealCard.tsx                ← Client Component (modal state)
      DealGrid.tsx
      FilterBar.tsx               ← Client Component (useSearchParams)
      RequestPackModal.tsx        ← Client Component
    ui/
      Button.tsx
      Logo.tsx
      GoldDivider.tsx
      SectionLabel.tsx
  lib/
    contentful.ts
    resend.ts
  types/
    deal.ts
tests/
  api/
    register.test.ts
    contact.test.ts
tailwind.config.ts
vitest.config.ts
.env.local                        ← Never committed
```

---

## Task 1: Scaffold Next.js Project

**Files:**
- Create: all project files via `create-next-app`
- Modify: `package.json` — add test script and dependencies

- [ ] **Step 1: Run create-next-app in the repo root**

```bash
cd /c/Users/DELL/source/repos/RealEstateWebSite
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --no-import-alias
```

When asked "The directory . contains files that could conflict. Continue? › (y/N)" — type `y`.
Accept all default prompts (TypeScript, ESLint, Tailwind, src dir, App Router, no custom alias).

Expected: project scaffolded, `node_modules/` installed, `src/app/` created.

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install contentful resend zod
```

Expected: `contentful`, `resend`, `zod` appear in `package.json` dependencies.

- [ ] **Step 3: Install dev dependencies**

```bash
npm install -D vitest @vitejs/plugin-react @vitest/coverage-v8
```

Expected: vitest packages appear in `devDependencies`.

- [ ] **Step 4: Add test script to package.json**

Open `package.json` and add to the `"scripts"` block:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Add .gitignore entries**

Open `.gitignore` and append:

```
.env.local
.superpowers/
```

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```

Expected: `ready - started server on 0.0.0.0:3000` (or similar). Open http://localhost:3000 — default Next.js page loads. Stop with Ctrl+C.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 14 project with TypeScript, Tailwind, Vitest"
```

---

## Task 2: Tailwind Design Tokens + Global CSS

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace tailwind.config.ts**

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        obsidian:  '#0a0a0a',
        charcoal:  '#111111',
        carbon:    '#1e1e1e',
        gold:      '#c9a84c',
        'gold-light': '#e8c96b',
        ivory:     '#f0e8d8',
        stone:     '#888888',
      },
      fontFamily: {
        serif: ['var(--font-cormorant)', 'Georgia', 'serif'],
        sans:  ['var(--font-montserrat)', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        widest2: '0.28em',
        widest3: '0.32em',
      },
    },
  },
  plugins: [],
}
export default config
```

- [ ] **Step 2: Replace src/app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    scroll-behavior: smooth;
  }

  body {
    @apply bg-obsidian text-ivory font-sans antialiased;
  }

  * {
    border-radius: 0;
  }
}

@layer utilities {
  @keyframes goldPulse {
    0%, 100% { opacity: 0.04; }
    50%       { opacity: 0.09; }
  }

  .animate-gold-pulse {
    animation: goldPulse 5s ease-in-out infinite;
  }
}
```

- [ ] **Step 3: Verify tokens compile**

```bash
npm run dev
```

Expected: no Tailwind errors in the console. Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.ts src/app/globals.css
git commit -m "feat: add design tokens and global CSS for luxury dark theme"
```

---

## Task 3: Root Layout + Fonts

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Replace src/app/layout.tsx**

```tsx
import type { Metadata } from 'next'
import { Cormorant_Garamond, Montserrat } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
})

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-montserrat',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Dream Build Property Group | UK Property Deal Sourcing',
  description:
    'Below-market-value property deals, buy-to-let investment, and acquisition support across the UK.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${cormorant.variable} ${montserrat.variable}`}>
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
```

Note: `Navbar` and `Footer` do not exist yet — create stub files so the layout compiles.

- [ ] **Step 2: Create stub Navbar**

Create `src/components/layout/Navbar.tsx`:

```tsx
export function Navbar() {
  return <nav />
}
```

- [ ] **Step 3: Create stub Footer**

Create `src/components/layout/Footer.tsx`:

```tsx
export function Footer() {
  return <footer />
}
```

- [ ] **Step 4: Replace src/app/page.tsx with minimal placeholder**

```tsx
export default function HomePage() {
  return <div className="min-h-screen" />
}
```

- [ ] **Step 5: Verify build**

```bash
npm run dev
```

Expected: page loads at http://localhost:3000 with no errors. Stop with Ctrl+C.

- [ ] **Step 6: Commit**

```bash
git add src/
git commit -m "feat: add root layout with Cormorant Garamond and Montserrat fonts"
```

---

## Task 4: UI Primitives

**Files:**
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/Logo.tsx`
- Create: `src/components/ui/GoldDivider.tsx`
- Create: `src/components/ui/SectionLabel.tsx`

- [ ] **Step 1: Create Button.tsx**

```tsx
import Link from 'next/link'

interface ButtonProps {
  children: React.ReactNode
  href?: string
  onClick?: () => void
  variant?: 'primary' | 'secondary'
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
  fullWidth?: boolean
}

export function Button({
  children,
  href,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled,
  className = '',
  fullWidth = false,
}: ButtonProps) {
  const base =
    'inline-block px-8 py-3.5 text-xs font-semibold uppercase tracking-widest transition-colors duration-200 border'

  const variants = {
    primary:
      'border-gold text-gold hover:bg-gold hover:text-obsidian',
    secondary:
      'border-carbon text-stone hover:border-stone hover:text-ivory',
  }

  const classes = `${base} ${variants[variant]} ${fullWidth ? 'w-full text-center' : ''} ${className}`

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    )
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${classes} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 2: Create Logo.tsx**

```tsx
import Link from 'next/link'

interface LogoProps {
  className?: string
}

export function Logo({ className = '' }: LogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-4 no-underline ${className}`}>
      {/* Vertical gold rule */}
      <div className="w-px h-10 bg-gold flex-shrink-0" />
      <div>
        <p className="font-serif text-lg font-normal tracking-[0.2em] uppercase text-ivory leading-none">
          Dream Build
        </p>
        <p className="font-sans text-[0.5rem] font-medium tracking-[0.28em] uppercase text-gold mt-1">
          Property Group
        </p>
      </div>
    </Link>
  )
}
```

- [ ] **Step 3: Create GoldDivider.tsx**

```tsx
export function GoldDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`w-12 h-px bg-gold ${className}`} />
  )
}
```

- [ ] **Step 4: Create SectionLabel.tsx**

```tsx
export function SectionLabel({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <p
      className={`font-sans text-[0.65rem] font-semibold uppercase tracking-widest2 text-gold ${className}`}
    >
      {children}
    </p>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/
git commit -m "feat: add Button, Logo, GoldDivider, SectionLabel UI primitives"
```

---

## Task 5: Navbar

**Files:**
- Modify: `src/components/layout/Navbar.tsx`

- [ ] **Step 1: Replace Navbar.tsx**

```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'

const NAV_LINKS = [
  { href: '/',        label: 'Home' },
  { href: '/about',   label: 'About' },
  { href: '/deals',   label: 'Deals' },
  { href: '/contact', label: 'Contact' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-obsidian border-b border-carbon'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-8 h-[72px] flex items-center justify-between">
        <Logo />

        <ul className="hidden md:flex items-center gap-10 list-none">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`relative font-sans text-[0.65rem] font-semibold uppercase tracking-widest transition-colors duration-150 pb-1
                    ${active ? 'text-ivory' : 'text-stone hover:text-ivory'}
                    after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-gold
                    ${active ? 'after:opacity-100' : 'after:opacity-0 hover:after:opacity-100'}
                    after:transition-opacity after:duration-150
                  `}
                >
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>

        <Button href="/register" variant="primary" className="hidden md:inline-block text-[0.6rem] px-5 py-2.5">
          Register as Buyer
        </Button>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Verify visually**

```bash
npm run dev
```

Visit http://localhost:3000. Navbar should be transparent. Scroll down — after 80px it should become solid obsidian. Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Navbar.tsx
git commit -m "feat: add sticky Navbar with scroll-aware background and gold underline hover"
```

---

## Task 6: Footer

**Files:**
- Modify: `src/components/layout/Footer.tsx`

- [ ] **Step 1: Replace Footer.tsx**

```tsx
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'

const FOOTER_LINKS = [
  { href: '/',         label: 'Home' },
  { href: '/about',    label: 'About' },
  { href: '/deals',    label: 'Deals' },
  { href: '/register', label: 'Register' },
  { href: '/contact',  label: 'Contact' },
]

const COMPLIANCE =
  'Dream Build Property Group Ltd is registered with HMRC under the Money Laundering Regulations. ICO registered. Company No. [XXXXXXXX]. All deals are sourced for the purposes of introduction only. Dream Build Property Group Ltd is not authorised or regulated by the Financial Conduct Authority. Property investment involves risk. Past performance is not indicative of future results.'

export function Footer() {
  return (
    <footer className="bg-[#070707] border-t border-carbon">
      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Top row */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-8 border-b border-carbon">
          <Logo />

          <nav>
            <ul className="flex flex-wrap gap-8 list-none">
              {FOOTER_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="font-sans text-[0.6rem] font-medium uppercase tracking-widest text-stone hover:text-ivory transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Social icons */}
          <div className="flex gap-3">
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="w-8 h-8 border border-carbon flex items-center justify-center text-stone hover:border-gold hover:text-gold transition-colors text-[0.6rem] font-semibold"
            >
              in
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="w-8 h-8 border border-carbon flex items-center justify-center text-stone hover:border-gold hover:text-gold transition-colors text-[0.6rem] font-semibold"
            >
              ig
            </a>
          </div>
        </div>

        {/* Compliance */}
        <p className="mt-6 font-sans text-[0.5rem] text-[#383838] leading-relaxed max-w-3xl">
          {COMPLIANCE}
        </p>
      </div>
    </footer>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/Footer.tsx
git commit -m "feat: add Footer with nav links, social icons, compliance text"
```

---

## Task 7: Deal Types + Contentful Lib

**Files:**
- Create: `src/types/deal.ts`
- Create: `src/lib/contentful.ts`
- Create: `.env.local` (never committed)

- [ ] **Step 1: Create .env.local**

Create `.env.local` in the repo root (not committed — already in .gitignore):

```
CONTENTFUL_SPACE_ID=your_space_id_here
CONTENTFUL_ACCESS_TOKEN=your_delivery_token_here
RESEND_API_KEY=your_resend_key_here
RESEND_TO_EMAIL=your@email.com
```

Fill in real values after setting up Contentful and Resend accounts (see Step 2).

- [ ] **Step 2: Set up Contentful content model (manual)**

1. Log in at https://app.contentful.com and create a free space named "Dream Build"
2. Go to **Content model** → **Add content type** → name it `deal`, API identifier `deal`
3. Add these fields exactly:

| Field name     | API identifier  | Type        | Required | Notes                         |
|----------------|-----------------|-------------|----------|-------------------------------|
| Title          | `title`         | Short text  | Yes      |                               |
| Location       | `location`      | Short text  | Yes      | e.g. "Manchester, M14"        |
| Strategy       | `strategy`      | Short text  | Yes      | Validation: BTL, HMO, Flip    |
| Market Value   | `marketValue`   | Number      | Yes      |                               |
| Purchase Price | `purchasePrice` | Number      | Yes      |                               |
| Gross Yield    | `grossYield`    | Number      | Yes      |                               |
| BMV Percent    | `bmvPercent`    | Number      | Yes      |                               |
| Sourcing Fee   | `sourcingFee`   | Number      | Yes      |                               |
| Image          | `image`         | Media       | Yes      |                               |
| Featured       | `featured`      | Boolean     | No       |                               |
| Slug           | `slug`          | Short text  | Yes      | Unique, URL-safe               |

4. Save the content type.
5. Go to **Settings → API keys** → **Add API key** → copy the Space ID and Content Delivery API access token into `.env.local`.

- [ ] **Step 3: Create src/types/deal.ts**

```ts
export interface Deal {
  id: string
  title: string
  location: string
  strategy: 'BTL' | 'HMO' | 'Flip'
  marketValue: number
  purchasePrice: number
  grossYield: number
  bmvPercent: number
  sourcingFee: number
  imageUrl: string | null
  featured: boolean
  slug: string
}
```

- [ ] **Step 4: Create src/lib/contentful.ts**

```ts
import { createClient } from 'contentful'
import type { Deal } from '@/types/deal'

const client = createClient({
  space: process.env.CONTENTFUL_SPACE_ID!,
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN!,
})

function normalizeDeal(item: any): Deal {
  const f = item.fields
  return {
    id: item.sys.id,
    title: f.title,
    location: f.location,
    strategy: f.strategy,
    marketValue: f.marketValue,
    purchasePrice: f.purchasePrice,
    grossYield: f.grossYield,
    bmvPercent: f.bmvPercent,
    sourcingFee: f.sourcingFee,
    imageUrl: f.image?.fields?.file?.url
      ? `https:${f.image.fields.file.url}`
      : null,
    featured: f.featured ?? false,
    slug: f.slug,
  }
}

export async function getDeals(strategy?: string): Promise<Deal[]> {
  const query: Record<string, unknown> = {
    content_type: 'deal',
    order: '-sys.createdAt',
  }
  if (strategy && strategy !== 'All') {
    query['fields.strategy'] = strategy
  }
  const response = await client.getEntries(query)
  return response.items.map(normalizeDeal)
}

export async function getFeaturedDeal(): Promise<Deal | null> {
  const response = await client.getEntries({
    content_type: 'deal',
    'fields.featured': true,
    limit: 1,
  })
  return response.items[0] ? normalizeDeal(response.items[0]) : null
}
```

- [ ] **Step 5: Commit**

```bash
git add src/types/ src/lib/contentful.ts
git commit -m "feat: add Deal type and Contentful fetch helpers"
```

---

## Task 8: Resend Email Helper

**Files:**
- Create: `src/lib/resend.ts`

- [ ] **Step 1: Set up Resend account (manual)**

1. Sign up at https://resend.com (free tier supports 3,000 emails/month)
2. Create an API key → copy it into `.env.local` as `RESEND_API_KEY`
3. Set `RESEND_TO_EMAIL` to your inbox address in `.env.local`

- [ ] **Step 2: Create src/lib/resend.ts**

```ts
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
```

Note: replace the `from` domain with your verified Resend domain once DNS is configured. During development you can use Resend's onboarding domain.

- [ ] **Step 3: Commit**

```bash
git add src/lib/resend.ts
git commit -m "feat: add Resend email helper"
```

---

## Task 9: Vitest Setup + API Route Tests

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/api/register.test.ts`
- Create: `tests/api/contact.test.ts`

- [ ] **Step 1: Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 2: Create tests/api/register.test.ts**

```ts
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
```

- [ ] **Step 3: Run tests — expect FAIL (route not yet created)**

```bash
npm test
```

Expected: tests fail with "Cannot find module '@/app/api/register/route'". This confirms TDD is working.

- [ ] **Step 4: Create tests/api/contact.test.ts**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/resend', () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: 'mock-id' }),
}))

async function getHandler() {
  const mod = await import('@/app/api/contact/route')
  return mod.POST
}

const VALID_BODY = {
  name: 'Alex Turner',
  email: 'alex@example.com',
  message: 'Interested in the Manchester deal.',
}

describe('POST /api/contact', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 200 and success:true with valid data', async () => {
    const POST = await getHandler()
    const req = new Request('http://localhost/api/contact', {
      method: 'POST',
      body: JSON.stringify(VALID_BODY),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it('returns 400 when message is empty', async () => {
    const POST = await getHandler()
    const req = new Request('http://localhost/api/contact', {
      method: 'POST',
      body: JSON.stringify({ ...VALID_BODY, message: '' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })

  it('calls sendEmail twice (owner + auto-reply)', async () => {
    const { sendEmail } = await import('@/lib/resend')
    const POST = await getHandler()
    const req = new Request('http://localhost/api/contact', {
      method: 'POST',
      body: JSON.stringify(VALID_BODY),
      headers: { 'Content-Type': 'application/json' },
    })
    await POST(req as any)
    expect(vi.mocked(sendEmail)).toHaveBeenCalledTimes(2)
  })

  it('returns 500 when sendEmail throws', async () => {
    const { sendEmail } = await import('@/lib/resend')
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error('Resend down'))
    const POST = await getHandler()
    const req = new Request('http://localhost/api/contact', {
      method: 'POST',
      body: JSON.stringify(VALID_BODY),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(500)
  })
})
```

- [ ] **Step 5: Commit tests**

```bash
git add vitest.config.ts tests/
git commit -m "test: add failing Vitest tests for register and contact API routes"
```

---

## Task 10: /api/register Route

**Files:**
- Create: `src/app/api/register/route.ts`

- [ ] **Step 1: Create src/app/api/register/route.ts**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sendEmail } from '@/lib/resend'

const RegisterSchema = z.object({
  name:      z.string().min(1, 'Name is required'),
  email:     z.string().email('Valid email required'),
  phone:     z.string().optional().default(''),
  budget:    z.string().min(1, 'Budget is required'),
  strategy:  z.enum(['BTL', 'HMO', 'Flip', 'All']),
  buyerType: z.enum(['Cash', 'Mortgage']),
  areas:     z.string().min(1, 'Preferred areas required'),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = RegisterSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { errors: result.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const d = result.data
  try {
    await sendEmail({
      to: process.env.RESEND_TO_EMAIL!,
      subject: `New Investor Registration — ${d.name}`,
      html: `
        <h2 style="font-family:sans-serif">New Investor Registration</h2>
        <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">
          <tr><td style="padding:6px 16px 6px 0;color:#666">Name</td><td><strong>${d.name}</strong></td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#666">Email</td><td>${d.email}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#666">Phone</td><td>${d.phone || 'Not provided'}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#666">Budget</td><td>${d.budget}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#666">Strategy</td><td>${d.strategy}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#666">Buyer Type</td><td>${d.buyerType}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#666">Areas</td><td>${d.areas}</td></tr>
        </table>
      `,
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Failed to send — please try again.' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Run tests — expect PASS**

```bash
npm test tests/api/register.test.ts
```

Expected output:
```
✓ tests/api/register.test.ts (4)
  ✓ POST /api/register > returns 200 and success:true with valid data
  ✓ POST /api/register > returns 400 when email is invalid
  ✓ POST /api/register > returns 400 when required fields are missing
  ✓ POST /api/register > returns 500 when sendEmail throws
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/register/
git commit -m "feat: implement POST /api/register with Zod validation and Resend"
```

---

## Task 11: /api/contact Route

**Files:**
- Create: `src/app/api/contact/route.ts`

- [ ] **Step 1: Create src/app/api/contact/route.ts**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sendEmail } from '@/lib/resend'

const ContactSchema = z.object({
  name:       z.string().min(1, 'Name is required'),
  email:      z.string().email('Valid email required'),
  message:    z.string().min(1, 'Message is required'),
  dealTitle:  z.string().optional(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = ContactSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { errors: result.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const d = result.data
  const subject = d.dealTitle
    ? `Deal Enquiry — ${d.dealTitle}`
    : `New Enquiry from ${d.name}`

  try {
    await sendEmail({
      to: process.env.RESEND_TO_EMAIL!,
      subject,
      html: `
        <h2 style="font-family:sans-serif">${subject}</h2>
        <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">
          <tr><td style="padding:6px 16px 6px 0;color:#666">From</td><td><strong>${d.name}</strong></td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#666">Email</td><td>${d.email}</td></tr>
          ${d.dealTitle ? `<tr><td style="padding:6px 16px 6px 0;color:#666">Deal</td><td>${d.dealTitle}</td></tr>` : ''}
          <tr><td style="padding:6px 16px 6px 0;color:#666;vertical-align:top">Message</td><td>${d.message}</td></tr>
        </table>
      `,
    })

    await sendEmail({
      to: d.email,
      subject: 'We received your enquiry — Dream Build Property Group',
      html: `
        <p style="font-family:sans-serif">Hi ${d.name},</p>
        <p style="font-family:sans-serif">Thank you for getting in touch. We respond to all enquiries within 24 hours.</p>
        <p style="font-family:sans-serif">— The Dream Build Property Group Team</p>
      `,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Failed to send — please try again.' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Run all tests — expect all PASS**

```bash
npm test
```

Expected:
```
✓ tests/api/register.test.ts (4)
✓ tests/api/contact.test.ts (4)
Test Files  2 passed (2)
Tests       8 passed (8)
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/contact/
git commit -m "feat: implement POST /api/contact with Zod validation, owner email, and auto-reply"
```

---

## Task 12: Hero Component

**Files:**
- Create: `src/components/home/Hero.tsx`

- [ ] **Step 1: Create src/components/home/Hero.tsx**

```tsx
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'

export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-8 overflow-hidden bg-obsidian">
      {/* Animated gold glow — CSS only, no JS */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none animate-gold-pulse"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 60%, rgba(201,168,76,0.12) 0%, transparent 70%)',
        }}
      />

      {/* Secondary static glow for depth */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 40% 30% at 20% 40%, rgba(201,168,76,0.04) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-3xl">
        <Logo className="mb-4" />

        <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-light text-ivory leading-[1.05]">
          We Find The Deal.<br />
          You Build The Wealth.
        </h1>

        <p className="font-sans text-sm font-light tracking-wider text-stone max-w-lg leading-relaxed">
          UK property deal sourcing, acquisition, and investment — done properly.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-2">
          <Button href="/deals">View Current Deals</Button>
          <Button href="/register" variant="secondary">Work With Us</Button>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/home/Hero.tsx
git commit -m "feat: add Hero section with CSS gold glow animation"
```

---

## Task 13: WhatWeDo + WhyDreamBuild + HowItWorks

**Files:**
- Create: `src/components/home/WhatWeDo.tsx`
- Create: `src/components/home/WhyDreamBuild.tsx`
- Create: `src/components/home/HowItWorks.tsx`

- [ ] **Step 1: Create src/components/home/WhatWeDo.tsx**

```tsx
import { SectionLabel } from '@/components/ui/SectionLabel'
import { GoldDivider } from '@/components/ui/GoldDivider'

const SERVICES = [
  {
    icon: '🏠',
    title: 'Deal Sourcing',
    body: 'We find below-market-value properties across the UK and package them with full due diligence packs for investors.',
  },
  {
    icon: '📈',
    title: 'Buy To Let',
    body: 'Residential investment properties hand-selected for strong rental yields and long-term capital growth.',
  },
  {
    icon: '🔑',
    title: 'Acquisition Support',
    body: 'End-to-end support from the initial deal introduction through to legal completion.',
  },
]

export function WhatWeDo() {
  return (
    <section className="bg-[#0e0e0e] py-24 px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <SectionLabel className="mb-4">Our Services</SectionLabel>
          <h2 className="font-serif text-4xl font-light text-ivory">What We Do</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-carbon">
          {SERVICES.map(({ icon, title, body }) => (
            <div key={title} className="bg-[#0e0e0e] p-10 flex flex-col gap-5">
              <span className="text-3xl">{icon}</span>
              <GoldDivider />
              <h3 className="font-serif text-2xl font-normal text-ivory">{title}</h3>
              <p className="font-sans text-sm font-light text-stone leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Create src/components/home/WhyDreamBuild.tsx**

```tsx
import { SectionLabel } from '@/components/ui/SectionLabel'

const TRUST_SIGNALS = [
  'Fully compliant — HMRC registered under the Money Laundering Regulations',
  'Verified below-market-value deals only — every deal backed by comparables',
  'Full due diligence pack provided on every property',
  'UK-wide sourcing network covering all major investment regions',
]

export function WhyDreamBuild() {
  return (
    <section className="bg-obsidian py-24 px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        {/* Left */}
        <div>
          <SectionLabel className="mb-6">Why Dream Build</SectionLabel>
          <blockquote className="font-serif text-3xl md:text-4xl font-light text-ivory leading-snug mb-10">
            "Most investors don't have time to find the deals.
            <span className="text-gold"> We do.</span>"
          </blockquote>
          <ul className="flex flex-col gap-4">
            {TRUST_SIGNALS.map((signal) => (
              <li key={signal} className="flex items-start gap-4">
                <div className="w-4 h-px bg-gold mt-2.5 flex-shrink-0" />
                <p className="font-sans text-sm font-light text-stone leading-relaxed">{signal}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* Right — trust badges */}
        <div className="flex flex-col gap-3">
          {[
            '✓  HMRC Registered — AML Compliant',
            '✓  ICO Registered Data Controller',
            '✓  Full Due Diligence on Every Deal',
            '✓  UK-Wide Sourcing Network',
          ].map((badge) => (
            <div
              key={badge}
              className="bg-charcoal border border-carbon border-l-2 border-l-gold px-5 py-4 font-sans text-sm text-stone"
            >
              {badge}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Create src/components/home/HowItWorks.tsx**

```tsx
import { SectionLabel } from '@/components/ui/SectionLabel'

const STEPS = [
  {
    num: '01',
    title: 'Register as a Buyer',
    body: 'Complete the investor registration form with your contact details and preferences.',
  },
  {
    num: '02',
    title: 'Tell Us Your Criteria',
    body: 'Share your budget, preferred strategy (BTL, HMO, Flip), and target locations.',
  },
  {
    num: '03',
    title: 'Receive Matched Deal Packs',
    body: 'We send you verified, below-market-value deal packs matched to your exact criteria.',
  },
  {
    num: '04',
    title: 'Complete & Build Your Portfolio',
    body: 'Instruct your solicitor, complete the purchase, and grow your property portfolio.',
  },
]

export function HowItWorks() {
  return (
    <section className="bg-[#0d0d0d] py-24 px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <SectionLabel className="mb-4">The Process</SectionLabel>
          <h2 className="font-serif text-4xl font-light text-ivory">How It Works</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-carbon">
          {STEPS.map(({ num, title, body }) => (
            <div key={num} className="bg-[#0d0d0d] p-8 flex flex-col gap-4">
              <span className="font-serif text-5xl font-light text-carbon leading-none select-none">
                {num}
              </span>
              <h3 className="font-sans text-xs font-semibold uppercase tracking-widest text-ivory">
                {title}
              </h3>
              <p className="font-sans text-sm font-light text-stone leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/home/WhatWeDo.tsx src/components/home/WhyDreamBuild.tsx src/components/home/HowItWorks.tsx
git commit -m "feat: add WhatWeDo, WhyDreamBuild, HowItWorks home sections"
```

---

## Task 14: FeaturedDeal + Testimonials + CtaBanner

**Files:**
- Create: `src/components/home/FeaturedDeal.tsx`
- Create: `src/components/home/Testimonials.tsx`
- Create: `src/components/home/CtaBanner.tsx`

- [ ] **Step 1: Create src/components/home/FeaturedDeal.tsx**

```tsx
import Image from 'next/image'
import Link from 'next/link'
import type { Deal } from '@/types/deal'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { Button } from '@/components/ui/Button'

export function FeaturedDeal({ deal }: { deal: Deal | null }) {
  if (!deal) return null

  const bmv = Math.round(deal.bmvPercent)
  const saving = deal.marketValue - deal.purchasePrice

  return (
    <section className="bg-obsidian py-24 px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        {/* Deal card */}
        <div className="bg-charcoal border border-carbon overflow-hidden">
          <div className="relative h-56 bg-[#1a1a1a]">
            {deal.imageUrl ? (
              <Image
                src={deal.imageUrl}
                alt={deal.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center font-sans text-xs uppercase tracking-widest text-[#333]">
                Property Photo
              </div>
            )}
            <div className="absolute top-3 right-3 bg-gold text-obsidian font-sans text-xs font-bold px-3 py-1">
              {bmv}% BMV
            </div>
          </div>

          <div className="p-6">
            <p className="font-sans text-[0.6rem] font-semibold uppercase tracking-widest text-gold mb-1">
              {deal.location}
            </p>
            <p className="font-serif text-xl text-ivory mb-4">
              {deal.title} · {deal.strategy}
            </p>

            <div className="grid grid-cols-2 gap-4 py-4 border-t border-carbon mb-4">
              {[
                { label: 'Market Value',    value: `£${deal.marketValue.toLocaleString()}`,    gold: false },
                { label: 'Purchase Price',  value: `£${deal.purchasePrice.toLocaleString()}`,  gold: true  },
                { label: 'Gross Yield',     value: `${deal.grossYield}%`,                      gold: true  },
                { label: 'Saving',          value: `£${saving.toLocaleString()}`,              gold: true  },
              ].map(({ label, value, gold }) => (
                <div key={label}>
                  <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone mb-1">{label}</p>
                  <p className={`font-serif text-xl ${gold ? 'text-gold' : 'text-ivory'}`}>{value}</p>
                </div>
              ))}
            </div>

            <Button href="/contact" fullWidth>Request Full Pack</Button>
          </div>
        </div>

        {/* Editorial copy */}
        <div>
          <SectionLabel className="mb-5">Featured Deal</SectionLabel>
          <h2 className="font-serif text-4xl font-light text-ivory leading-snug mb-6">
            Current Opportunities<br />For Serious Investors
          </h2>
          <p className="font-sans text-sm font-light text-stone leading-relaxed mb-8">
            Every deal we source is independently verified against market comparables, packaged with a full due diligence report, and made available exclusively to registered buyers. No auctions, no inflated prices.
          </p>
          <Link
            href="/deals"
            className="font-sans text-xs font-semibold uppercase tracking-widest text-gold border-b border-gold/30 pb-0.5 hover:border-gold transition-colors"
          >
            View All Deals →
          </Link>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Create src/components/home/Testimonials.tsx**

```tsx
import { SectionLabel } from '@/components/ui/SectionLabel'

const TESTIMONIALS = [
  {
    quote:
      'Dream Build found us a 14% BMV deal in Leeds that we would never have sourced ourselves. Seamless from start to finish.',
    name: 'James H.',
    role: 'BTL Investor · Leeds',
  },
  {
    quote:
      'Professional, compliant, and they actually deliver. The deal pack gave us everything we needed to proceed with confidence.',
    name: 'Sarah K.',
    role: 'Portfolio Investor · Manchester',
  },
  {
    quote:
      'Registered my criteria on a Monday, had a matched deal pack by Wednesday. This is how sourcing should work.',
    name: 'Marcus T.',
    role: 'HMO Investor · Birmingham',
  },
]

export function Testimonials() {
  return (
    <section className="bg-[#0e0e0e] py-24 px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <SectionLabel className="mb-4">Investor Feedback</SectionLabel>
          <h2 className="font-serif text-4xl font-light text-ivory">What Investors Say</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-carbon">
          {TESTIMONIALS.map(({ quote, name, role }) => (
            <div key={name} className="bg-charcoal p-8 flex flex-col gap-4">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="text-gold text-sm">★</span>
                ))}
              </div>
              <blockquote className="font-serif text-lg font-light italic text-stone leading-relaxed flex-1">
                "{quote}"
              </blockquote>
              <div>
                <p className="font-sans text-xs font-semibold uppercase tracking-widest text-ivory">{name}</p>
                <p className="font-sans text-xs text-carbon mt-0.5">{role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Create src/components/home/CtaBanner.tsx**

```tsx
import { Button } from '@/components/ui/Button'

export function CtaBanner() {
  return (
    <section
      className="py-24 px-8 border-t border-b border-gold/10"
      style={{
        background: 'linear-gradient(135deg, #0f0b03 0%, #1a1200 50%, #0f0b03 100%)',
      }}
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
          <h2 className="font-serif text-4xl md:text-5xl font-light text-ivory mb-3">
            Ready to invest?
          </h2>
          <p className="font-sans text-sm font-light text-stone tracking-wide">
            Register your buyer criteria today and receive matched deals direct to your inbox.
          </p>
        </div>
        <Button href="/register" className="flex-shrink-0 text-xs px-10 py-4">
          Get Started
        </Button>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/home/
git commit -m "feat: add FeaturedDeal, Testimonials, CtaBanner home sections"
```

---

## Task 15: Home Page Assembly

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace src/app/page.tsx**

```tsx
import { Hero }           from '@/components/home/Hero'
import { WhatWeDo }       from '@/components/home/WhatWeDo'
import { WhyDreamBuild }  from '@/components/home/WhyDreamBuild'
import { HowItWorks }     from '@/components/home/HowItWorks'
import { FeaturedDeal }   from '@/components/home/FeaturedDeal'
import { Testimonials }   from '@/components/home/Testimonials'
import { CtaBanner }      from '@/components/home/CtaBanner'
import { getFeaturedDeal } from '@/lib/contentful'

export const revalidate = 60

export default async function HomePage() {
  const featuredDeal = await getFeaturedDeal()

  return (
    <>
      <Hero />
      <WhatWeDo />
      <WhyDreamBuild />
      <HowItWorks />
      <FeaturedDeal deal={featuredDeal} />
      <Testimonials />
      <CtaBanner />
    </>
  )
}
```

- [ ] **Step 2: Verify home page renders**

```bash
npm run dev
```

Visit http://localhost:3000. All 7 sections should render. If `CONTENTFUL_SPACE_ID` is not yet set in `.env.local`, `FeaturedDeal` will return null and not render — that is correct behaviour. Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: assemble home page with all sections and Contentful featured deal"
```

---

## Task 16: Deal Components + Deals Page

**Files:**
- Create: `src/components/deals/DealCard.tsx`
- Create: `src/components/deals/RequestPackModal.tsx`
- Create: `src/components/deals/FilterBar.tsx`
- Create: `src/components/deals/DealGrid.tsx`
- Create: `src/app/deals/page.tsx`

- [ ] **Step 1: Create src/components/deals/RequestPackModal.tsx**

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface Props {
  dealTitle: string
  onClose: () => void
}

export function RequestPackModal({ dealTitle, onClose }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          message: `Please send me the full deal pack for: ${dealTitle}`,
          dealTitle,
        }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
    } catch {
      setStatus('error')
      setErrorMsg('Failed to send — please try again.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian/90"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-charcoal border border-carbon w-full max-w-md p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-serif text-2xl font-light text-ivory">Request Full Pack</h3>
          <button
            onClick={onClose}
            className="text-stone hover:text-ivory font-sans text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="font-sans text-xs text-stone mb-6 leading-relaxed">
          Deal: <span className="text-gold">{dealTitle}</span>
        </p>

        {status === 'success' ? (
          <p className="font-sans text-sm text-gold">
            Request sent. We'll be in touch within 24 hours.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-obsidian border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold transition-colors"
                placeholder="John Smith"
              />
            </div>
            <div>
              <label className="block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-obsidian border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold transition-colors"
                placeholder="john@example.com"
              />
            </div>
            {status === 'error' && (
              <p className="font-sans text-xs text-red-400">{errorMsg}</p>
            )}
            <Button
              type="submit"
              fullWidth
              disabled={status === 'loading'}
              className="mt-2"
            >
              {status === 'loading' ? 'Sending…' : 'Send Request'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create src/components/deals/DealCard.tsx**

```tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { Deal } from '@/types/deal'
import { RequestPackModal } from './RequestPackModal'

export function DealCard({ deal }: { deal: Deal }) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <div className="bg-charcoal border border-carbon overflow-hidden group">
        <div className="relative h-48 bg-[#1a1a1a]">
          {deal.imageUrl ? (
            <Image
              src={deal.imageUrl}
              alt={deal.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center font-sans text-xs uppercase tracking-widest text-[#333]">
              Property Photo
            </div>
          )}
          <div className="absolute top-3 right-3 bg-gold text-obsidian font-sans text-xs font-bold px-3 py-1">
            {Math.round(deal.bmvPercent)}% BMV
          </div>
          <div className="absolute bottom-3 left-3 border border-carbon bg-charcoal/80 font-sans text-[0.55rem] uppercase tracking-widest text-stone px-2 py-1">
            {deal.strategy}
          </div>
        </div>

        <div className="p-5">
          <p className="font-sans text-[0.6rem] font-semibold uppercase tracking-widest text-gold mb-1">
            {deal.location}
          </p>
          <p className="font-serif text-lg text-ivory mb-4">{deal.title}</p>

          <div className="grid grid-cols-2 gap-3 py-3 border-t border-carbon mb-4">
            {[
              { label: 'Purchase Price', value: `£${deal.purchasePrice.toLocaleString()}`, gold: true },
              { label: 'Market Value',   value: `£${deal.marketValue.toLocaleString()}`,   gold: false },
              { label: 'Gross Yield',    value: `${deal.grossYield}%`,                     gold: true },
              { label: 'Sourcing Fee',   value: `£${deal.sourcingFee.toLocaleString()}`,   gold: false },
            ].map(({ label, value, gold }) => (
              <div key={label}>
                <p className="font-sans text-[0.5rem] uppercase tracking-widest text-stone mb-0.5">{label}</p>
                <p className={`font-serif text-lg ${gold ? 'text-gold' : 'text-ivory'}`}>{value}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="w-full py-3 border border-gold text-gold font-sans text-xs font-semibold uppercase tracking-widest hover:bg-gold hover:text-obsidian transition-colors"
          >
            Request Full Pack
          </button>
        </div>
      </div>

      {modalOpen && (
        <RequestPackModal
          dealTitle={deal.title}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 3: Create src/components/deals/FilterBar.tsx**

```tsx
'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const STRATEGIES = ['All', 'BTL', 'HMO', 'Flip'] as const

export function FilterBar() {
  const searchParams = useSearchParams()
  const current = searchParams.get('strategy') ?? 'All'

  return (
    <div className="flex flex-wrap gap-0.5 py-4 px-8 border-b border-carbon">
      {STRATEGIES.map((s) => {
        const active = s === current || (s === 'All' && !searchParams.get('strategy'))
        return (
          <Link
            key={s}
            href={s === 'All' ? '/deals' : `/deals?strategy=${s}`}
            className={`px-5 py-2 border font-sans text-xs font-semibold uppercase tracking-widest transition-colors ${
              active
                ? 'border-gold text-gold'
                : 'border-carbon text-stone hover:border-stone hover:text-ivory'
            }`}
          >
            {s}
          </Link>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Create src/components/deals/DealGrid.tsx**

```tsx
import type { Deal } from '@/types/deal'
import { DealCard } from './DealCard'

export function DealGrid({ deals }: { deals: Deal[] }) {
  if (deals.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="font-serif text-2xl font-light text-stone">
          Deals coming soon — register to be notified.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-carbon">
      {deals.map((deal) => (
        <DealCard key={deal.id} deal={deal} />
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Create src/app/deals/page.tsx**

```tsx
import { Suspense } from 'react'
import Link from 'next/link'
import { getDeals } from '@/lib/contentful'
import { FilterBar } from '@/components/deals/FilterBar'
import { DealGrid } from '@/components/deals/DealGrid'
import { Button } from '@/components/ui/Button'
import { SectionLabel } from '@/components/ui/SectionLabel'

export const revalidate = 60

export default async function DealsPage({
  searchParams,
}: {
  searchParams: { strategy?: string }
}) {
  const strategy = searchParams.strategy
  let deals = []
  try {
    deals = await getDeals(strategy)
  } catch {
    deals = []
  }

  return (
    <div className="min-h-screen bg-obsidian pt-[72px]">
      {/* Register banner */}
      <div className="bg-[#0f0b03] border-b border-gold/10 px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="font-sans text-sm font-light text-stone">
          Register to receive <span className="text-gold">deals direct to your inbox</span>
        </p>
        <Button href="/register" className="text-[0.6rem] px-5 py-2">
          Register →
        </Button>
      </div>

      {/* Header */}
      <div className="px-8 py-16 text-center border-b border-carbon">
        <SectionLabel className="mb-4">Available Now</SectionLabel>
        <h1 className="font-serif text-5xl font-light text-ivory">Current Deals</h1>
      </div>

      {/* Filter */}
      <Suspense>
        <FilterBar />
      </Suspense>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        <DealGrid deals={deals} />
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Verify deals page renders**

```bash
npm run dev
```

Visit http://localhost:3000/deals. Page renders with filter bar and empty state (no deals yet). Clicking filter buttons updates the URL. Stop with Ctrl+C.

- [ ] **Step 7: Commit**

```bash
git add src/components/deals/ src/app/deals/
git commit -m "feat: add deals page with DealCard, FilterBar, DealGrid, RequestPackModal"
```

---

## Task 17: Register Page

**Files:**
- Create: `src/app/register/page.tsx`

- [ ] **Step 1: Create src/app/register/page.tsx**

```tsx
'use client'

import { useState } from 'react'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { Button } from '@/components/ui/Button'

const FIELD_CLASS =
  'w-full bg-[#0e0e0e] border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold transition-colors'

const LABEL_CLASS =
  'block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2'

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', budget: '',
    strategy: 'BTL', buyerType: 'Cash', areas: '',
  })
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [serverError, setServerError] = useState('')

  function update(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrors({})
    setServerError('')

    const res = await fetch('/api/register', {
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

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-obsidian pt-[72px] flex items-center justify-center px-8">
        <div className="text-center max-w-lg">
          <p className="font-sans text-xs uppercase tracking-widest text-gold mb-6">Registration Received</p>
          <h1 className="font-serif text-4xl font-light text-ivory mb-6">
            Thank you for registering.
          </h1>
          <p className="font-sans text-sm font-light text-stone leading-relaxed">
            We'll match your criteria against our current deal pipeline and be in touch shortly.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-obsidian pt-[72px]">
      <div className="max-w-2xl mx-auto px-8 py-16">
        <SectionLabel className="mb-4">Join Our Buyer List</SectionLabel>
        <h1 className="font-serif text-5xl font-light text-ivory mb-3">
          Register Your Investment Criteria
        </h1>
        <p className="font-sans text-sm font-light text-stone mb-12 leading-relaxed">
          Every registration becomes a buyer profile. We match your criteria against every deal we source.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className={LABEL_CLASS}>Full Name</label>
              <input type="text" required value={form.name} onChange={update('name')} className={FIELD_CLASS} placeholder="John Smith" />
              {errors.name && <p className="font-sans text-xs text-gold mt-1">{errors.name[0]}</p>}
            </div>
            <div>
              <label className={LABEL_CLASS}>Email Address</label>
              <input type="email" required value={form.email} onChange={update('email')} className={FIELD_CLASS} placeholder="john@example.com" />
              {errors.email && <p className="font-sans text-xs text-gold mt-1">{errors.email[0]}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className={LABEL_CLASS}>Phone Number</label>
              <input type="tel" value={form.phone} onChange={update('phone')} className={FIELD_CLASS} placeholder="+44 7700 000000" />
            </div>
            <div>
              <label className={LABEL_CLASS}>Investment Budget</label>
              <input type="text" required value={form.budget} onChange={update('budget')} className={FIELD_CLASS} placeholder="e.g. £150,000 – £300,000" />
              {errors.budget && <p className="font-sans text-xs text-gold mt-1">{errors.budget[0]}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className={LABEL_CLASS}>Preferred Strategy</label>
              <select value={form.strategy} onChange={update('strategy')} className={FIELD_CLASS}>
                <option value="BTL">Buy To Let (BTL)</option>
                <option value="HMO">HMO</option>
                <option value="Flip">Flip</option>
                <option value="All">All Strategies</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLASS}>Buyer Type</label>
              <select value={form.buyerType} onChange={update('buyerType')} className={FIELD_CLASS}>
                <option value="Cash">Cash Buyer</option>
                <option value="Mortgage">Mortgage Buyer</option>
              </select>
            </div>
          </div>

          <div>
            <label className={LABEL_CLASS}>Preferred Areas</label>
            <input type="text" required value={form.areas} onChange={update('areas')} className={FIELD_CLASS} placeholder="e.g. Manchester, Leeds, Birmingham" />
            {errors.areas && <p className="font-sans text-xs text-gold mt-1">{errors.areas[0]}</p>}
          </div>

          {serverError && (
            <p className="font-sans text-xs text-red-400">{serverError}</p>
          )}

          <Button type="submit" fullWidth disabled={status === 'loading'} className="mt-2 py-4">
            {status === 'loading' ? 'Submitting…' : 'Submit Registration'}
          </Button>

          <p className="font-sans text-[0.55rem] text-[#3a3a3a] text-center leading-relaxed">
            Your details are kept strictly confidential and used only to match you with suitable investment opportunities.
          </p>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Test form manually**

```bash
npm run dev
```

Visit http://localhost:3000/register. Submit with invalid data — gold error messages should appear per field. Submit with valid data — success message renders. Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add src/app/register/
git commit -m "feat: add investor registration page with client-side form and field validation"
```

---

## Task 18: Contact Page

**Files:**
- Create: `src/app/contact/page.tsx`

- [ ] **Step 1: Create src/app/contact/page.tsx**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/contact/
git commit -m "feat: add contact page with enquiry form and auto-reply"
```

---

## Task 19: About Page

**Files:**
- Create: `src/app/about/page.tsx`

- [ ] **Step 1: Create src/app/about/page.tsx**

```tsx
import { SectionLabel } from '@/components/ui/SectionLabel'
import { GoldDivider } from '@/components/ui/GoldDivider'
import { Button } from '@/components/ui/Button'

const VALUES = [
  {
    name: 'Integrity',
    desc: 'Compliance is foundational, not optional. Every deal is sourced within HMRC and FCA guidelines.',
  },
  {
    name: 'Expertise',
    desc: 'Deep knowledge of UK property markets, deal structures, and investor requirements.',
  },
  {
    name: 'Results',
    desc: 'Deals that perform — verified below market value, strong yields, full due diligence.',
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-obsidian pt-[72px]">
      {/* Hero */}
      <section className="relative py-32 px-8 text-center border-b border-carbon overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 60% 60% at 50% 100%, rgba(201,168,76,0.05) 0%, transparent 70%)',
          }}
        />
        <SectionLabel className="mb-5 relative">Our Story</SectionLabel>
        <h1 className="font-serif text-5xl md:text-6xl font-light text-ivory leading-tight relative max-w-2xl mx-auto">
          Built on integrity.<br />Driven by results.
        </h1>
      </section>

      {/* Founder */}
      <section className="max-w-7xl mx-auto px-8 py-20 grid grid-cols-1 md:grid-cols-[180px_1fr] gap-12 items-start border-b border-carbon">
        {/* Headshot placeholder */}
        <div className="w-44 h-56 bg-charcoal border border-carbon flex items-center justify-center flex-shrink-0">
          <p className="font-sans text-xs uppercase tracking-widest text-stone text-center leading-loose">
            Professional<br />Headshot
          </p>
        </div>

        <div>
          <SectionLabel className="mb-3">Founder</SectionLabel>
          <h2 className="font-serif text-3xl font-light text-ivory mb-5">
            Dream Build Property Group
          </h2>
          <p className="font-sans text-sm font-light text-stone leading-relaxed mb-4">
            Founded by a property professional with years of experience navigating the UK investment market, Dream Build Property Group was created to bridge the gap between motivated sellers and serious investors — with full compliance, transparency, and due diligence at every step.
          </p>
          <p className="font-sans text-sm font-light text-stone leading-relaxed">
            We work with investors at every stage — from those building their first buy-to-let portfolio to experienced landlords scaling into HMOs and commercial conversions. Every deal we bring to market is one we would be proud to acquire ourselves.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="max-w-7xl mx-auto px-8 py-16 border-b border-carbon">
        <SectionLabel className="mb-5">Mission</SectionLabel>
        <blockquote className="border-l-2 border-gold pl-8 max-w-2xl">
          <p className="font-serif text-3xl font-light italic text-ivory leading-snug">
            "To make serious property investment accessible, transparent, and profitable."
          </p>
        </blockquote>
      </section>

      {/* Values */}
      <section className="max-w-7xl mx-auto px-8 py-16 border-b border-carbon">
        <SectionLabel className="mb-12">Our Values</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-carbon">
          {VALUES.map(({ name, desc }) => (
            <div key={name} className="bg-obsidian p-8">
              <h3 className="font-serif text-2xl font-normal text-ivory mb-3">{name}</h3>
              <GoldDivider className="mb-5" />
              <p className="font-sans text-sm font-light text-stone leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-8 py-16 flex flex-col sm:flex-row items-center justify-between gap-8">
        <p className="font-serif text-2xl font-light text-ivory">
          Ready to start your investment journey?
        </p>
        <Button href="/register">Register as a Buyer</Button>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/about/
git commit -m "feat: add About page with founder section, mission statement, and values"
```

---

## Task 20: Custom 404

**Files:**
- Create: `src/app/not-found.tsx`

- [ ] **Step 1: Create src/app/not-found.tsx**

```tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center text-center px-8">
      <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-6">404</p>
      <h1 className="font-serif text-5xl font-light text-ivory mb-6">Page Not Found</h1>
      <p className="font-sans text-sm font-light text-stone mb-10 max-w-sm leading-relaxed">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        href="/"
        className="px-8 py-3.5 border border-gold text-gold font-sans text-xs font-semibold uppercase tracking-widest hover:bg-gold hover:text-obsidian transition-colors"
      >
        Return Home
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: Verify 404 page**

```bash
npm run dev
```

Visit http://localhost:3000/nonexistent-page. Should render the custom 404 in the luxury dark style. Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add src/app/not-found.tsx
git commit -m "feat: add custom 404 page"
```

---

## Task 21: Final Build Verification + Deployment Prep

**Files:**
- No new files

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected:
```
✓ tests/api/register.test.ts (4)
✓ tests/api/contact.test.ts (4)
Test Files  2 passed (2)
Tests       8 passed (8)
```

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Expected: build completes with no type errors. Note any warnings but they should not block deployment.

- [ ] **Step 3: Deploy to Vercel**

```bash
npx vercel
```

When prompted:
- Set up and deploy? `y`
- Which scope? Select your account
- Link to existing project? `n`
- Project name: `dream-build-property-group`
- Root directory: `./`
- Override settings? `n`

After CLI deploy completes, go to the Vercel dashboard and set these environment variables under **Settings → Environment Variables**:

| Name | Value |
|---|---|
| `CONTENTFUL_SPACE_ID` | your Contentful space ID |
| `CONTENTFUL_ACCESS_TOKEN` | your Contentful delivery token |
| `RESEND_API_KEY` | your Resend API key |
| `RESEND_TO_EMAIL` | your inbox email address |

Then trigger a redeploy from the dashboard (or push a commit) so the env vars take effect.

- [ ] **Step 4: Connect GitHub repo to Vercel**

In the Vercel dashboard → **Settings → Git** → connect to `https://github.com/maxwellcudjoe/realestateapp.git`. Future pushes to `master` will auto-deploy.

- [ ] **Step 5: Add a deal in Contentful and verify end-to-end**

1. Log in to Contentful → Content → Add Entry → `deal`
2. Fill in all required fields, check `featured: true`, save and publish
3. Visit your Vercel deployment URL — the deal card should appear on the homepage and deals page

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete Dream Build Property Group website — all pages, API routes, tests"
git push origin master
```

Expected: Vercel auto-deploy triggers. Site is live.

---

## Post-Launch Checklist

- [ ] Replace `[XXXXXXXX]` in Footer with actual Companies House number
- [ ] Update contact email/phone in `src/app/contact/page.tsx`
- [ ] Update LinkedIn/Instagram URLs in `src/components/layout/Footer.tsx`
- [ ] Verify Resend `from` domain after DNS setup at dreambuildproperty.co.uk
- [ ] Connect custom domain in Vercel dashboard once purchased
- [ ] Replace headshot placeholder in About page with real photo
