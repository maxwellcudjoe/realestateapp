import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
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
          background: '#0a0a0a',
          color: '#c9a84c',
          fontFamily: 'Georgia, serif',
          fontSize: 96,
          fontWeight: 400,
          letterSpacing: 4,
        }}
      >
        <div style={{ display: 'flex', lineHeight: 1 }}>RB</div>
        <div
          style={{
            width: 60,
            height: 1,
            background: '#c9a84c',
            marginTop: 12,
          }}
        />
        <div
          style={{
            display: 'flex',
            fontFamily: 'Helvetica, sans-serif',
            fontSize: 9,
            letterSpacing: 4,
            color: '#c9a84c',
            marginTop: 10,
            textTransform: 'uppercase',
          }}
        >
          Réve Bâtir
        </div>
      </div>
    ),
    { ...size }
  )
}
