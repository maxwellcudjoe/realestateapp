import { describe, it, expect } from 'vitest'
import {
  DEAL_STAGES,
  VALID_DEAL_STAGES,
  TERMINAL_STAGES,
  dealStageLabel,
  STAGE_TRANSITIONS,
  canStageTransition,
} from '@/lib/deal-stages'

describe('deal-stages lib', () => {
  describe('VALID_DEAL_STAGES', () => {
    it('contains all 10 stages', () => {
      expect(VALID_DEAL_STAGES.size).toBe(10)
    })
  })

  describe('TERMINAL_STAGES', () => {
    it('contains COMPLETED and FALLEN_THROUGH', () => {
      expect(TERMINAL_STAGES.has('COMPLETED')).toBe(true)
      expect(TERMINAL_STAGES.has('FALLEN_THROUGH')).toBe(true)
    })
  })

  describe('dealStageLabel', () => {
    it('returns the human label for a known stage', () => {
      expect(dealStageLabel('PROPOSED')).toBe('Proposed')
      expect(dealStageLabel('COMPLETED')).toBe('Completed')
    })
    it('returns em-dash for null/undefined', () => {
      expect(dealStageLabel(null)).toBe('—')
      expect(dealStageLabel(undefined)).toBe('—')
    })
  })

  describe('STAGE_TRANSITIONS', () => {
    it('has an entry for every defined stage', () => {
      for (const stage of DEAL_STAGES) {
        expect(STAGE_TRANSITIONS[stage.value]).toBeDefined()
      }
    })

    it('terminal stages have empty transition lists', () => {
      expect(STAGE_TRANSITIONS['COMPLETED']).toEqual([])
      expect(STAGE_TRANSITIONS['FALLEN_THROUGH']).toEqual([])
    })

    it('every non-terminal stage can reach FALLEN_THROUGH', () => {
      for (const stage of DEAL_STAGES) {
        if (TERMINAL_STAGES.has(stage.value)) continue
        expect(STAGE_TRANSITIONS[stage.value]).toContain('FALLEN_THROUGH')
      }
    })

    it('OFFER_PENDING can return to PROPOSED (C8 counter-offer path)', () => {
      expect(STAGE_TRANSITIONS['OFFER_PENDING']).toContain('PROPOSED')
    })

    it('EXCHANGED → COMPLETED is allowed', () => {
      expect(STAGE_TRANSITIONS['EXCHANGED']).toContain('COMPLETED')
    })

    it('CONVEYANCING can skip optional SURVEY/MORTGAGE straight to EXCHANGED (cash buyers)', () => {
      expect(STAGE_TRANSITIONS['CONVEYANCING']).toContain('EXCHANGED')
    })
  })

  describe('canStageTransition', () => {
    it('returns true for permitted transitions', () => {
      expect(canStageTransition('PROPOSED', 'OFFER_PENDING')).toBe(true)
      expect(canStageTransition('EXCHANGED', 'COMPLETED')).toBe(true)
      expect(canStageTransition('OFFER_PENDING', 'PROPOSED')).toBe(true) // C8
    })

    it('returns false for jumps that skip required steps', () => {
      expect(canStageTransition('PROPOSED', 'COMPLETED')).toBe(false)
      expect(canStageTransition('OFFER_PENDING', 'EXCHANGED')).toBe(false)
    })

    it('returns false when staying on the same stage', () => {
      expect(canStageTransition('PROPOSED', 'PROPOSED')).toBe(false)
    })

    it('returns false for any transition out of a terminal state', () => {
      expect(canStageTransition('COMPLETED', 'EXCHANGED')).toBe(false)
      expect(canStageTransition('FALLEN_THROUGH', 'PROPOSED')).toBe(false)
    })

    it('returns true with options.override (even for terminal exits)', () => {
      expect(canStageTransition('COMPLETED', 'EXCHANGED', { override: true })).toBe(true)
      expect(canStageTransition('FALLEN_THROUGH', 'PROPOSED', { override: true })).toBe(true)
    })

    it('still returns false for same-stage transitions even with override', () => {
      expect(canStageTransition('PROPOSED', 'PROPOSED', { override: true })).toBe(false)
    })
  })
})
