/* eslint-disable */
// One-off script — generates logo variants from public/brand/logo-full.jpg.
// Run with: node scripts/generate-logo-variants.js
//
// Produces:
//   public/brand/logo-full.png       — transparent BG + original black ink
//   public/brand/logo-full-light.png — transparent BG + ivory ink (for dark UIs)
//   public/brand/logo-icon.png       — square 512x512 crop of the right-side roof+house motif
//   public/brand/logo-icon-light.png — same in ivory
//   public/brand/favicon-32.png
//   public/brand/favicon-180.png     — Apple touch icon
//   src/app/icon.png                 — Next.js app-router favicon

const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const SRC = path.join(__dirname, '..', 'public', 'brand', 'logo-full.jpg')
const OUT = path.join(__dirname, '..', 'public', 'brand')
const APP_ICON = path.join(__dirname, '..', 'src', 'app', 'icon.png')

// Brand ivory (matches the rest of the UI; near-white but warm).
const IVORY = { r: 0xf0, g: 0xe8, b: 0xd8 }

// Threshold above which a pixel counts as background. Tune if needed —
// the source has a cream BG ~#f4f4f0, the calligraphy is pure black.
const BG_THRESHOLD = 230

async function loadAsRaw() {
  const img = sharp(SRC).removeAlpha()
  const { data, info } = await img
    .raw()
    .toBuffer({ resolveWithObject: true })
  return { data, info }
}

/**
 * Build a transparent PNG with the calligraphy tinted to (r,g,b).
 * Background pixels (anything brighter than BG_THRESHOLD on all channels)
 * become transparent. Ink pixels keep an alpha proportional to their
 * darkness, preserving the hand-drawn anti-aliased edges.
 */
async function buildTinted(targetColor, outPath) {
  const { data, info } = await loadAsRaw()
  const { width, height, channels } = info
  const out = Buffer.alloc(width * height * 4)
  for (let i = 0, j = 0; i < data.length; i += channels, j += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    // Use perceptual luminance for "how inky is this pixel"
    const lum = (0.299 * r + 0.587 * g + 0.114 * b)
    if (lum >= BG_THRESHOLD) {
      out[j + 3] = 0  // fully transparent background
    } else {
      // Smooth alpha so anti-aliased edges remain anti-aliased.
      const alpha = Math.round(255 * (1 - lum / BG_THRESHOLD))
      out[j] = targetColor.r
      out[j + 1] = targetColor.g
      out[j + 2] = targetColor.b
      out[j + 3] = alpha
    }
  }
  await sharp(out, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(outPath)
  console.log(`✓ ${path.relative(process.cwd(), outPath)}`)
}

/**
 * Crop the icon-only region (the house/roof on the right of the wordmark).
 * Logo dimensions from the source: width ~1600, height ~1080. Calligraphy
 * occupies roughly the right half; the roof is centred around x≈55-95% / y≈25-65%.
 * We square-crop a 600px region around the house then resample to 512.
 */
async function buildIcon(targetColor, outPath, size = 512) {
  const meta = await sharp(SRC).metadata()
  const w = meta.width
  const h = meta.height
  // Square crop centred on the roof motif. The architecture floats right of
  // centre — anchor at ~70% horizontal, ~45% vertical for a balanced square.
  // Clamp to stay inside the image bounds.
  const cropSize = Math.min(Math.round(h * 0.6), Math.round(w * 0.35))
  const cropLeft = Math.min(Math.round(w * 0.58), w - cropSize)
  const cropTop = Math.min(Math.round(h * 0.22), h - cropSize)
  const cropped = await sharp(SRC)
    .extract({ left: cropLeft, top: cropTop, width: cropSize, height: cropSize })
    .toBuffer()
  // Now run through the same tint logic, but on the cropped buffer.
  const { data, info } = await sharp(cropped).removeAlpha().raw()
    .toBuffer({ resolveWithObject: true })
  const out = Buffer.alloc(info.width * info.height * 4)
  for (let i = 0, j = 0; i < data.length; i += info.channels, j += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    if (lum >= BG_THRESHOLD) {
      out[j + 3] = 0
    } else {
      out[j] = targetColor.r
      out[j + 1] = targetColor.g
      out[j + 2] = targetColor.b
      out[j + 3] = Math.round(255 * (1 - lum / BG_THRESHOLD))
    }
  }
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outPath)
  console.log(`✓ ${path.relative(process.cwd(), outPath)}`)
}

async function buildArchOnly(targetColor, outPath, size = 512) {
  // Pure architectural sketch (no letterforms). Crop to the right-third
  // where the house line floats above "Bâtir".
  const meta = await sharp(SRC).metadata()
  const w = meta.width, h = meta.height
  const cropLeft = Math.round(w * 0.55)
  const cropTop = Math.round(h * 0.20)
  const cropW = Math.round(w * 0.40)
  const cropH = Math.round(h * 0.35)
  const cropped = await sharp(SRC)
    .extract({ left: cropLeft, top: cropTop, width: cropW, height: cropH })
    .toBuffer()
  const { data, info } = await sharp(cropped).removeAlpha().raw()
    .toBuffer({ resolveWithObject: true })
  const out = Buffer.alloc(info.width * info.height * 4)
  for (let i = 0, j = 0; i < data.length; i += info.channels, j += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    if (lum >= BG_THRESHOLD) {
      out[j + 3] = 0
    } else {
      out[j] = targetColor.r
      out[j + 1] = targetColor.g
      out[j + 2] = targetColor.b
      out[j + 3] = Math.round(255 * (1 - lum / BG_THRESHOLD))
    }
  }
  // Pad to a square then resize
  const aspect = info.width / info.height
  const targetW = aspect > 1 ? size : Math.round(size * aspect)
  const targetH = aspect > 1 ? Math.round(size / aspect) : size
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .resize(targetW, targetH, { fit: 'inside' })
    .extend({
      top: Math.round((size - targetH) / 2),
      bottom: Math.round((size - targetH) / 2),
      left: Math.round((size - targetW) / 2),
      right: Math.round((size - targetW) / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(outPath)
  console.log(`✓ ${path.relative(process.cwd(), outPath)}`)
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })

  // Full wordmark — transparent BG, two ink colours
  await buildTinted({ r: 0, g: 0, b: 0 }, path.join(OUT, 'logo-full.png'))
  await buildTinted(IVORY, path.join(OUT, 'logo-full-light.png'))

  // Icon-only (square) for favicons + tight spaces (includes letterform hint)
  await buildIcon({ r: 0, g: 0, b: 0 }, path.join(OUT, 'logo-icon.png'), 512)
  await buildIcon(IVORY, path.join(OUT, 'logo-icon-light.png'), 512)

  // Pure architectural mark (no letterforms) — for tight UI + section flourishes
  await buildArchOnly({ r: 0, g: 0, b: 0 }, path.join(OUT, 'logo-mark.png'), 512)
  await buildArchOnly(IVORY, path.join(OUT, 'logo-mark-light.png'), 512)
  // Gold version for accent use
  await buildArchOnly({ r: 0xc9, g: 0xa8, b: 0x4c }, path.join(OUT, 'logo-mark-gold.png'), 512)

  // Favicons — Next.js picks up src/app/icon.png automatically
  await sharp(path.join(OUT, 'logo-icon-light.png'))
    .resize(32, 32)
    .png()
    .toFile(path.join(OUT, 'favicon-32.png'))
  console.log(`✓ public/brand/favicon-32.png`)

  await sharp(path.join(OUT, 'logo-icon-light.png'))
    .resize(180, 180)
    .png()
    .toFile(path.join(OUT, 'favicon-180.png'))
  console.log(`✓ public/brand/favicon-180.png`)

  // App-router icon (replaces icon.tsx)
  await sharp(path.join(OUT, 'logo-icon-light.png'))
    .resize(64, 64, {
      fit: 'contain',
      background: { r: 0x0a, g: 0x0a, b: 0x0a, alpha: 1 },
    })
    .extend({
      top: 4, bottom: 4, left: 4, right: 4,
      background: { r: 0x0a, g: 0x0a, b: 0x0a, alpha: 1 },
    })
    .png()
    .toFile(APP_ICON)
  console.log(`✓ src/app/icon.png`)

  // Apple touch icon at /apple-icon.png (Next picks this up)
  const APPLE = path.join(__dirname, '..', 'src', 'app', 'apple-icon.png')
  await sharp(path.join(OUT, 'logo-icon-light.png'))
    .resize(160, 160, {
      fit: 'contain',
      background: { r: 0x0a, g: 0x0a, b: 0x0a, alpha: 1 },
    })
    .extend({
      top: 10, bottom: 10, left: 10, right: 10,
      background: { r: 0x0a, g: 0x0a, b: 0x0a, alpha: 1 },
    })
    .png()
    .toFile(APPLE)
  console.log(`✓ src/app/apple-icon.png`)

  // Open Graph image (1200x630) — dark canvas + logo + tagline
  // Replaces the dynamic opengraph-image.tsx.
  const OG = path.join(__dirname, '..', 'src', 'app', 'opengraph-image.png')
  const ogBaseSvg = Buffer.from(`
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g" cx="50%" cy="60%" r="60%">
          <stop offset="0%" stop-color="#c9a84c" stop-opacity="0.18"/>
          <stop offset="70%" stop-color="#0a0a0a" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1200" height="630" fill="#0a0a0a"/>
      <rect width="1200" height="630" fill="url(#g)"/>
      <text x="600" y="100" text-anchor="middle"
            font-family="Helvetica, sans-serif" font-size="16"
            letter-spacing="8" fill="#c9a84c"
            text-transform="uppercase">
        UK PROPERTY DEAL PLATFORM
      </text>
      <line x1="540" y1="500" x2="660" y2="500" stroke="#c9a84c" stroke-opacity="0.5" stroke-width="1"/>
      <text x="600" y="540" text-anchor="middle"
            font-family="Georgia, serif" font-size="28" font-style="italic"
            fill="#f0e8d8">
        Built for investors.
      </text>
      <text x="600" y="585" text-anchor="middle"
            font-family="Helvetica, sans-serif" font-size="13"
            letter-spacing="6" fill="#888888">
        revebatir.co.uk
      </text>
    </svg>
  `)

  // Resize the logo to fit nicely in the OG image
  const logoForOg = await sharp(path.join(OUT, 'logo-full-light.png'))
    .resize(600, null, { fit: 'inside' })
    .toBuffer()

  await sharp(ogBaseSvg)
    .composite([
      { input: logoForOg, top: 180, left: 300 },
    ])
    .png()
    .toFile(OG)
  console.log(`✓ src/app/opengraph-image.png`)

  // Twitter image — same as OG for simplicity
  const TW = path.join(__dirname, '..', 'src', 'app', 'twitter-image.png')
  fs.copyFileSync(OG, TW)
  console.log(`✓ src/app/twitter-image.png (copied from OG)`)

  console.log('\nAll variants generated.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
