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
