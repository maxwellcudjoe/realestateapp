// Curated UK property investment areas. Each entry has a stable `code` (used in DB)
// and a `label` (shown to users). Codes never change once shipped — adding new ones
// is fine, renaming is not.

export interface AreaOption {
  code: string
  label: string
  group: string
}

export const TARGET_AREAS: AreaOption[] = [
  // London (by postcode zone)
  { code: 'london-central', label: 'London — Central (EC, WC)', group: 'London' },
  { code: 'london-north', label: 'London — North (N, NW)', group: 'London' },
  { code: 'london-east', label: 'London — East (E)', group: 'London' },
  { code: 'london-south-east', label: 'London — South East (SE)', group: 'London' },
  { code: 'london-south-west', label: 'London — South West (SW)', group: 'London' },
  { code: 'london-west', label: 'London — West (W)', group: 'London' },
  { code: 'london-greater', label: 'Greater London (outer boroughs)', group: 'London' },

  // North West
  { code: 'manchester', label: 'Manchester (M)', group: 'North West' },
  { code: 'salford', label: 'Salford', group: 'North West' },
  { code: 'liverpool', label: 'Liverpool (L)', group: 'North West' },
  { code: 'preston', label: 'Preston (PR)', group: 'North West' },
  { code: 'bolton', label: 'Bolton (BL)', group: 'North West' },
  { code: 'oldham', label: 'Oldham (OL)', group: 'North West' },
  { code: 'wigan', label: 'Wigan (WN)', group: 'North West' },
  { code: 'lancaster', label: 'Lancaster (LA)', group: 'North West' },

  // Yorkshire & North East
  { code: 'leeds', label: 'Leeds (LS)', group: 'Yorkshire & North East' },
  { code: 'sheffield', label: 'Sheffield (S)', group: 'Yorkshire & North East' },
  { code: 'bradford', label: 'Bradford (BD)', group: 'Yorkshire & North East' },
  { code: 'hull', label: 'Hull (HU)', group: 'Yorkshire & North East' },
  { code: 'york', label: 'York (YO)', group: 'Yorkshire & North East' },
  { code: 'newcastle', label: 'Newcastle (NE)', group: 'Yorkshire & North East' },
  { code: 'sunderland', label: 'Sunderland (SR)', group: 'Yorkshire & North East' },
  { code: 'durham', label: 'Durham (DH)', group: 'Yorkshire & North East' },
  { code: 'middlesbrough', label: 'Middlesbrough (TS)', group: 'Yorkshire & North East' },

  // Midlands
  { code: 'birmingham', label: 'Birmingham (B)', group: 'Midlands' },
  { code: 'coventry', label: 'Coventry (CV)', group: 'Midlands' },
  { code: 'wolverhampton', label: 'Wolverhampton (WV)', group: 'Midlands' },
  { code: 'leicester', label: 'Leicester (LE)', group: 'Midlands' },
  { code: 'nottingham', label: 'Nottingham (NG)', group: 'Midlands' },
  { code: 'derby', label: 'Derby (DE)', group: 'Midlands' },
  { code: 'stoke', label: 'Stoke-on-Trent (ST)', group: 'Midlands' },
  { code: 'northampton', label: 'Northampton (NN)', group: 'Midlands' },

  // South & South West
  { code: 'bristol', label: 'Bristol (BS)', group: 'South & South West' },
  { code: 'bath', label: 'Bath (BA)', group: 'South & South West' },
  { code: 'plymouth', label: 'Plymouth (PL)', group: 'South & South West' },
  { code: 'exeter', label: 'Exeter (EX)', group: 'South & South West' },
  { code: 'southampton', label: 'Southampton (SO)', group: 'South & South West' },
  { code: 'portsmouth', label: 'Portsmouth (PO)', group: 'South & South West' },
  { code: 'brighton', label: 'Brighton (BN)', group: 'South & South West' },
  { code: 'reading', label: 'Reading (RG)', group: 'South & South West' },
  { code: 'oxford', label: 'Oxford (OX)', group: 'South & South West' },
  { code: 'cambridge', label: 'Cambridge (CB)', group: 'South & South West' },
  { code: 'milton-keynes', label: 'Milton Keynes (MK)', group: 'South & South West' },

  // Wales
  { code: 'cardiff', label: 'Cardiff (CF)', group: 'Wales' },
  { code: 'swansea', label: 'Swansea (SA)', group: 'Wales' },
  { code: 'newport', label: 'Newport (NP)', group: 'Wales' },
  { code: 'wales-other', label: 'Wales — Other', group: 'Wales' },

  // Scotland
  { code: 'edinburgh', label: 'Edinburgh (EH)', group: 'Scotland' },
  { code: 'glasgow', label: 'Glasgow (G)', group: 'Scotland' },
  { code: 'aberdeen', label: 'Aberdeen (AB)', group: 'Scotland' },
  { code: 'dundee', label: 'Dundee (DD)', group: 'Scotland' },
  { code: 'scotland-other', label: 'Scotland — Other', group: 'Scotland' },

  // Northern Ireland
  { code: 'belfast', label: 'Belfast (BT)', group: 'Northern Ireland' },
  { code: 'ni-other', label: 'Northern Ireland — Other', group: 'Northern Ireland' },
] as const

export const VALID_AREA_CODES = new Set(TARGET_AREAS.map((a) => a.code))

export function areaLabel(code: string): string {
  return TARGET_AREAS.find((a) => a.code === code)?.label ?? code
}

/** Group the catalog by region for the multi-select UI. */
export function areasByGroup(): Record<string, AreaOption[]> {
  const out: Record<string, AreaOption[]> = {}
  for (const a of TARGET_AREAS) {
    if (!out[a.group]) out[a.group] = []
    out[a.group].push(a)
  }
  return out
}
