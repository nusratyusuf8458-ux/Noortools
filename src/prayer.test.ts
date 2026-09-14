import { describe, expect, it } from 'vitest'
import { calculatePrayerTimes, nextPrayer, qiblaBearing } from './prayer'

describe('prayer engine', () => {
  const date = new Date(2026, 8, 14, 12, 0, 0)
  it('returns the six core solar events for a normal latitude', () => {
    const prayers = calculatePrayerTimes(date, 19.076, 72.8777)
    expect(prayers.map(p => p.name)).toEqual(['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha'])
    expect(prayers.every(p => p.time instanceof Date)).toBe(true)
  })
  it('rolls to tomorrow Fajr after Isha', () => {
    const prayers = calculatePrayerTimes(date, 19.076, 72.8777)
    const late = new Date(prayers[prayers.length - 1].time.getTime() + 60_000)
    const next = nextPrayer(prayers, 19.076, 72.8777, late)
    expect(next.name).toBe('Fajr')
    expect(next.time.getDate()).toBe(late.getDate() + 1)
  })
  it('calculates a bounded Qibla bearing', () => {
    const bearing = qiblaBearing(19.076, 72.8777)
    expect(bearing).toBeGreaterThanOrEqual(0)
    expect(bearing).toBeLessThan(360)
  })
})
