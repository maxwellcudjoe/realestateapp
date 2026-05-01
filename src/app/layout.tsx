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

const SITE_URL = 'https://www.revebatir.co.uk'
const SITE_NAME = 'Rêve Bâtir Realty'
const SITE_DESCRIPTION =
  'Below-market-value property deals, buy-to-let investment, and acquisition support across the UK. Verified, compliant, exclusively for registered buyers.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | UK Property Deal Sourcing`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  generator: 'Next.js',
  keywords: [
    'UK property deal sourcing',
    'BMV property',
    'buy to let UK',
    'HMO investment',
    'property investment UK',
    'below market value deals',
    'Manchester BTL',
    'Leeds BTL',
    'Birmingham HMO',
  ],
  referrer: 'origin-when-cross-origin',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} | UK Property Deal Sourcing`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} | UK Property Deal Sourcing`,
    description: SITE_DESCRIPTION,
  },
}

const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@type': 'RealEstateAgent',
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  email: 'info@revebatir.co.uk',
  areaServed: {
    '@type': 'Country',
    name: 'United Kingdom',
  },
  knowsAbout: [
    'Below-market-value property',
    'Buy-to-let investment',
    'HMO investment',
    'Property flipping',
    'Property deal sourcing',
  ],
  // Filled in once published:
  // address: { '@type': 'PostalAddress', ... },
  // sameAs: ['https://linkedin.com/...', 'https://instagram.com/...'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${cormorant.variable} ${montserrat.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(STRUCTURED_DATA),
          }}
        />
      </head>
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
