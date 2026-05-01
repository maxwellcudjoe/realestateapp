import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          color: '#c9a84c',
          fontFamily: 'Georgia, serif',
          fontSize: 18,
          fontWeight: 500,
          letterSpacing: 0,
          borderRadius: 4,
        }}
      >
        RB
      </div>
    ),
    { ...size }
  )
}
