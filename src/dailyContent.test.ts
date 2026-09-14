import { describe, expect, it } from 'vitest'
import { dailySelectionId, selectDailyDhikr, selectDailyDua, selectDailyName } from './dailyContent'

const names = Array.from({ length: 99 }, (_, index) => ({ id: `allah-name:${index + 1}` }))
const duas = Array.from({ length: 4 }, (_, index) => ({ id: `dua:${index + 1}` }))
const azkar = Array.from({ length: 3 }, (_, index) => ({ id: `azkar:${index + 1}` }))

describe('deterministic daily selection', () => {
  it('selects the same verified record for the same date', () => {
    const date = new Date('2026-09-14T15:00:00Z')
    expect(selectDailyName(names as never, date)?.id).toBe(selectDailyName(names as never, date)?.id)
    expect(selectDailyDua(duas as never, date)?.id).toBe(selectDailyDua(duas as never, date)?.id)
    expect(selectDailyDhikr(azkar as never, date)?.id).toBe(selectDailyDhikr(azkar as never, date)?.id)
  })
  it('returns null for an empty dataset and generates stable selection ids', () => {
    const date = new Date('2026-09-14T00:00:00Z')
    expect(selectDailyName([] as never[], date)).toBeNull()
    expect(selectDailyDua([] as never[], date)).toBeNull()
    expect(dailySelectionId('dua', 'dua:1', date)).toBe('daily:dua:2026-09-14:dua:1')
  })
})
