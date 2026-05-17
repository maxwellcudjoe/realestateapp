export const DEAL_DOCUMENT_TYPES = [
  { value: 'MEMO_OF_SALE',          label: 'Memorandum of Sale' },
  { value: 'DRAFT_CONTRACT',        label: 'Draft Contract' },
  { value: 'SEARCHES',              label: 'Search Results' },
  { value: 'SURVEY',                label: 'Survey Report' },
  { value: 'MORTGAGE_OFFER',        label: 'Mortgage Offer' },
  { value: 'EXCHANGE_CONTRACT',     label: 'Exchange Contract' },
  { value: 'COMPLETION_STATEMENT',  label: 'Completion Statement' },
  { value: 'OTHER',                 label: 'Other' },
] as const

export const VALID_DEAL_DOC_TYPES: Set<string> = new Set(DEAL_DOCUMENT_TYPES.map((t) => t.value))

export function dealDocTypeLabel(value: string): string {
  return DEAL_DOCUMENT_TYPES.find((t) => t.value === value)?.label ?? value
}
