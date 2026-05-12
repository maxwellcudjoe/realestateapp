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
        obsidian:  '#141414',
        charcoal:  '#1d1d1d',
        carbon:    '#2a2a2a',
        gold:      '#c9a84c',
        'gold-light': '#e8c96b',
        ivory:     '#f0e8d8',
        stone:     '#b3b3b3',
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
