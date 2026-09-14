import { describe, expect, it } from 'vitest'
import { localDateKey, localParts, timezoneFromCoordinates, timezoneOffsetMinutes } from './timezone'

describe('coordinate timezone', () => {
  it('resolves India coordinates to the India timezone', () => {
    expect(timezoneFromCoordinates(19.076, 72.8777)).toBe('Asia/Kolkata')
  })

  it('resolves a different-world timezone without using device timezone', () => {
    expect(timezoneFromCoordinates(40.7128, -74.006)).toBe('America/New_York')
  })

  it('converts the same instant to different local dates correctly', () => {
    const instant = new Date('2026-09-14T23:30:00Z')
    expect(localDateKey(instant, 'Asia/Kolkata')).toBe('2026-09-15')
    expect(localDateKey(instant, 'America/New_York')).toBe('2026-09-14')
  })

  it('reports DST-aware offsets for New York', () => {
    const winter = new Date('2026-01-15T17:00:00Z')
    const summer = new Date('2026-07-15T16:00:00Z')
    expect(timezoneOffsetMinutes(winter, 'America/New_York')).toBe(-300)
    expect(timezoneOffsetMinutes(summer, 'America/New_York')).toBe(-240)
  })

  it('exposes selected-location local clock parts', () => {
    const parts = localParts(new Date('2026-09-14T23:30:00Z'), 'Asia/Kolkata')
    expect(parts.year).toBe(2026)
    expect(parts.month).toBe(9)
    expect(parts.day).toBe(15)
    expect(parts.hour).toBe(5)
    expect(parts.minute).toBe(0)
  })
})
