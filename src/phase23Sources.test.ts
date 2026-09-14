import { describe, expect, it } from 'vitest'
import { getPhase23Source, isRedistributionCleared, PHASE_23_SOURCES } from './phase23Sources'

describe('Phase 2.3 source registry', () => {
  it('contains only explicit redistribution states', () => {
    for (const source of PHASE_23_SOURCES) expect(['cleared', 'restricted', 'blocked', 'unknown']).toContain(source.redistributionStatus)
  })

  it('never treats blocked or unknown as cleared', () => {
    expect(isRedistributionCleared(getPhase23Source('hadith.sunnahcom')!)).toBe(false)
    expect(isRedistributionCleared({ ...getPhase23Source('hadith.sunnahcom')!, redistributionStatus: 'unknown' })).toBe(false)
  })

  it('clears only the audited Pickthall source', () => {
    const pickthall = getPhase23Source('quran-translation.pickthall.1930')!
    expect(pickthall.license).toMatch(/Public domain/i)
    expect(isRedistributionCleared(pickthall)).toBe(true)
    expect(getPhase23Source('quran-translation.tanzil.translations')!.redistributionStatus).toBe('blocked')
    expect(getPhase23Source('quran-audio.quran-foundation')!.redistributionStatus).toBe('blocked')
  })
})
