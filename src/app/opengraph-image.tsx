import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Rêve Bâtir Realty — UK Property Deal Sourcing'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'radial-gradient(ellipse at 50% 60%, rgba(201,168,76,0.12) 0%, #0a0a0a 70%)',
          color: '#f0e8d8',
          padding: 80,
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            fontFamily: 'Helvetica, sans-serif',
            fontSize: 16,
            letterSpacing: 8,
            color: '#c9a84c',
            textTransform: 'uppercase',
            marginBottom: 40,
            display: 'flex',
          }}
        >
          UK Property Deal Sourcing
        </div>

        {/* Logo block */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 28,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 1,
              height: 96,
              background: '#c9a84c',
            }}
          />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: 80,
                fontWeight: 300,
                letterSpacing: 8,
                color: '#f0e8d8',
                lineHeight: 1,
                textTransform: 'uppercase',
                display: 'flex',
              }}
            >
              Rêve Bâtir
            </div>
            <div
              style={{
                fontFamily: 'Helvetica, sans-serif',
                fontSize: 18,
                fontWeight: 500,
                letterSpacing: 10,
                color: '#c9a84c',
                marginTop: 12,
                textTransform: 'uppercase',
                display: 'flex',
              }}
            >
              Realty
            </div>
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 36,
            fontWeight: 300,
            color: '#f0e8d8',
            textAlign: 'center',
            display: 'flex',
            marginTop: 20,
          }}
        >
          We Find The Deal. You Build The Wealth.
        </div>

        {/* Bottom domain */}
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            fontFamily: 'Helvetica, sans-serif',
            fontSize: 14,
            letterSpacing: 6,
            color: '#888888',
            textTransform: 'uppercase',
            display: 'flex',
          }}
        >
          revebatir.co.uk
        </div>
      </div>
    ),
    { ...size }
  )
}
