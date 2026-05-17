// Canonical deal pipeline stages. PROPOSED is the entry state; FALLEN_THROUGH and
// COMPLETED are terminal. The forward path is suggested but not enforced — admin
// can move freely (e.g. skip SURVEY for cash buyers).

export const DEAL_STAGES = [
  { value: 'PROPOSED',       label: 'Proposed',          description: 'Deal posted, awaiting investor response' },
  { value: 'OFFER_PENDING',  label: 'Offer Pending',     description: 'Offer made to vendor, awaiting their decision' },
  { value: 'OFFER_ACCEPTED', label: 'Offer Accepted',    description: 'Vendor accepted — proceeding to memorandum' },
  { value: 'MEMO_OF_SALE',   label: 'Memorandum of Sale',description: 'Memo issued, solicitors instructed' },
  { value: 'CONVEYANCING',   label: 'Conveyancing',      description: 'Searches, enquiries, draft contract' },
  { value: 'SURVEY',         label: 'Survey',            description: 'Property survey in progress' },
  { value: 'MORTGAGE',       label: 'Mortgage',          description: 'Mortgage offer being processed' },
  { value: 'EXCHANGED',      label: 'Exchanged',         description: 'Contracts exchanged — completion pending' },
  { value: 'COMPLETED',      label: 'Completed',         description: 'Sale complete' },
  { value: 'FALLEN_THROUGH', label: 'Fallen Through',    description: 'Deal did not proceed' },
] as const

export const VALID_DEAL_STAGES: Set<string> = new Set(DEAL_STAGES.map((s) => s.value))
export const TERMINAL_STAGES = new Set(['COMPLETED', 'FALLEN_THROUGH'])

export function dealStageLabel(value: string | null | undefined): string {
  if (!value) return '—'
  return DEAL_STAGES.find((s) => s.value === value)?.label ?? value
}

export function dealStageDescription(value: string | null | undefined): string {
  if (!value) return ''
  return DEAL_STAGES.find((s) => s.value === value)?.description ?? ''
}

/** Stages investors should see in their timeline — excludes the FALLEN_THROUGH branch unless reached. */
export function visibleStagesForTimeline(currentStage: string): typeof DEAL_STAGES[number][] {
  if (currentStage === 'FALLEN_THROUGH') {
    return DEAL_STAGES.filter((s) => s.value !== 'COMPLETED')
  }
  return DEAL_STAGES.filter((s) => s.value !== 'FALLEN_THROUGH')
}
