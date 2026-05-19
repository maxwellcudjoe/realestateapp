// Canonical deal pipeline stages. PROPOSED is the entry state; FALLEN_THROUGH and
// COMPLETED are terminal. Forward path is loosely enforced via STAGE_TRANSITIONS
// (admin can skip optional stages like SURVEY for cash buyers, but cannot
// arbitrarily jump backwards or out of terminal states without an explicit
// override + reason — see `canStageTransition`).

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

/**
 * Allowed forward transitions per stage. Each list contains stages that can
 * follow the key — admins can skip optional steps (e.g. SURVEY → EXCHANGED for
 * cash buyers) but cannot jump backwards or out of a terminal state without
 * an explicit override.
 *
 * COMPLETED and FALLEN_THROUGH have empty lists — exiting them requires an
 * override + reason via the stage PATCH endpoint.
 */
export const STAGE_TRANSITIONS: Record<string, readonly string[]> = {
  PROPOSED:        ['OFFER_PENDING', 'FALLEN_THROUGH'],
  OFFER_PENDING:   ['OFFER_ACCEPTED', 'PROPOSED', 'FALLEN_THROUGH'], // PROPOSED is the C8 counter-offer path
  OFFER_ACCEPTED:  ['MEMO_OF_SALE', 'FALLEN_THROUGH'],
  MEMO_OF_SALE:    ['CONVEYANCING', 'FALLEN_THROUGH'],
  CONVEYANCING:    ['SURVEY', 'MORTGAGE', 'EXCHANGED', 'FALLEN_THROUGH'],
  SURVEY:          ['MORTGAGE', 'EXCHANGED', 'FALLEN_THROUGH'],
  MORTGAGE:        ['EXCHANGED', 'FALLEN_THROUGH'],
  EXCHANGED:       ['COMPLETED', 'FALLEN_THROUGH'],
  COMPLETED:       [],
  FALLEN_THROUGH:  [],
}

/**
 * Returns true if `to` is a permitted next stage from `from`. With
 * `options.override`, returns true unconditionally — caller must pair this
 * with a recorded reason in the stage history note for audit.
 */
export function canStageTransition(from: string, to: string, options: { override?: boolean } = {}): boolean {
  if (from === to) return false
  if (options.override) return true
  return STAGE_TRANSITIONS[from]?.includes(to) ?? false
}
