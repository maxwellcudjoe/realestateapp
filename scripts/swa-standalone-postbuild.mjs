// Copies the static assets + public folder into Next.js's standalone output so
// Azure Static Web Apps can serve them from .next/standalone. Cross-platform
// replacement for the `cp -r` snippet in the Microsoft SWA docs (works on the
// Windows dev box and the Linux SWA build agent alike).
import { cpSync, existsSync, mkdirSync } from 'node:fs'

const standalone = '.next/standalone'

if (!existsSync(standalone)) {
  console.error(
    '[swa-postbuild] .next/standalone not found — is `output: "standalone"` set in next.config.mjs?',
  )
  process.exit(1)
}

mkdirSync(`${standalone}/.next`, { recursive: true })
cpSync('.next/static', `${standalone}/.next/static`, { recursive: true })
console.log('[swa-postbuild] copied .next/static -> standalone')

if (existsSync('public')) {
  cpSync('public', `${standalone}/public`, { recursive: true })
  console.log('[swa-postbuild] copied public -> standalone')
}

console.log('[swa-postbuild] done.')
