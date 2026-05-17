export const PROPERTY_DOCUMENT_TYPES = [
  { value: 'TITLE_DEED',         label: 'Title Deed' },
  { value: 'EPC',                label: 'EPC Certificate' },
  { value: 'GAS_SAFETY',         label: 'Gas Safety Certificate (annual)' },
  { value: 'EICR',               label: 'Electrical Installation Condition Report (5-year)' },
  { value: 'INSURANCE',          label: 'Insurance Policy' },
  { value: 'TENANCY_AGREEMENT',  label: 'Tenancy Agreement' },
  { value: 'RENT_STATEMENT',     label: 'Rent Statement' },
  { value: 'OTHER',              label: 'Other' },
] as const

export const VALID_PROPERTY_DOC_TYPES: Set<string> = new Set(PROPERTY_DOCUMENT_TYPES.map((t) => t.value))

export function propertyDocTypeLabel(value: string): string {
  return PROPERTY_DOCUMENT_TYPES.find((t) => t.value === value)?.label ?? value
}
