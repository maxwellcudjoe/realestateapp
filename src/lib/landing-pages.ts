import { TARGET_AREAS } from './target-areas'

export const LANDING_PAGE_STRATEGIES = ['btl', 'hmo', 'flip'] as const
export type LandingStrategySlug = (typeof LANDING_PAGE_STRATEGIES)[number]

export const LANDING_PAGE_CITIES = [
  'manchester',
  'liverpool',
  'leeds',
  'birmingham',
  'nottingham',
  'sheffield',
  'bristol',
  'cardiff',
] as const
export type LandingCitySlug = (typeof LANDING_PAGE_CITIES)[number]

export interface LandingPage {
  strategySlug: LandingStrategySlug
  strategyCode: 'BTL' | 'HMO' | 'FLIP'
  strategyLabel: string
  citySlug: LandingCitySlug
  cityLabel: string
  cityShort: string
  contentfulSlug: string
}

const STRATEGY_META: Record<LandingStrategySlug, { code: 'BTL' | 'HMO' | 'FLIP'; label: string }> = {
  btl: { code: 'BTL', label: 'Buy To Let' },
  hmo: { code: 'HMO', label: 'HMO' },
  flip: { code: 'FLIP', label: 'Flip' },
}

function cityLabel(slug: LandingCitySlug): string {
  const area = TARGET_AREAS.find((a) => a.code === slug)
  return area?.label ?? slug
}

function cityShort(slug: LandingCitySlug): string {
  const label = cityLabel(slug)
  const match = /^[^()]+/.exec(label)
  return (match ? match[0] : label).trim()
}

export function getAllLandingPages(): LandingPage[] {
  const out: LandingPage[] = []
  for (const strategySlug of LANDING_PAGE_STRATEGIES) {
    for (const citySlug of LANDING_PAGE_CITIES) {
      const s = STRATEGY_META[strategySlug]
      out.push({
        strategySlug,
        strategyCode: s.code,
        strategyLabel: s.label,
        citySlug,
        cityLabel: cityLabel(citySlug),
        cityShort: cityShort(citySlug),
        contentfulSlug: `${strategySlug}-${citySlug}`,
      })
    }
  }
  return out
}

export function getLandingPage(
  strategySlug: string,
  citySlug: string,
): LandingPage | null {
  if (!(LANDING_PAGE_STRATEGIES as readonly string[]).includes(strategySlug)) return null
  if (!(LANDING_PAGE_CITIES as readonly string[]).includes(citySlug)) return null
  return (
    getAllLandingPages().find(
      (p) => p.strategySlug === strategySlug && p.citySlug === citySlug,
    ) ?? null
  )
}

export function isValidStrategySlug(s: string): s is LandingStrategySlug {
  return (LANDING_PAGE_STRATEGIES as readonly string[]).includes(s)
}

export function isValidCitySlug(s: string): s is LandingCitySlug {
  return (LANDING_PAGE_CITIES as readonly string[]).includes(s)
}
