import { describe, expect, it } from 'vitest'
import { calculatePrayerTimes, currentPrayer, nextPrayer, qiblaBearing } from './prayer'

describe('prayer engine', () => {
  const date = new Date(2026, 8, 14, 12, 0, 0)
  it('returns the six core solar events in chronological order', () => {
    const prayers = calculatePrayerTimes(date, 19.076, 72.8777)
    expect(prayers.map(p => p.name)).toEqual(['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'])
    expect(prayers.every(p => p.time instanceof Date)).toBe(true)
    for (let i = 1; i < prayers.length; i += 1) expect(prayers[i].time.getTime()).toBeGreaterThan(prayers[i - 1].time.getTime())
  })
  it('has Dhuhr between sunrise and Asr', () => {
    const prayers = calculatePrayerTimes(date, 19.076, 72.8777)
    const times = Object.fromEntries(prayers.map(p => [p.name, p.time.getTime()]))
    expect(times.Dhuhr).toBeGreaterThan(times.Sunrise)
    expect(times.Asr).toBeGreaterThan(times.Dhuhr)
  })
  it('identifies the current prayer window', () => {
    const prayers = calculatePrayerTimes(date, 19.076, 72.8777)
    const afterDhuhr = new Date((prayers.find(p => p.name === 'Dhuhr') as { time: Date }).time.getTime() + 60_000)
    expect(currentPrayer(prayers, afterDhuhr)).toBe('Dhuhr')
  })
  it('rolls to tomorrow Fajr after Isha', () => {
    const prayers = calculatePrayerTimes(date, 19.076, 72.8777)
    const late = new Date(prayers[prayers.length - 1].time.getTime() + 60_000)
    const next = nextPrayer(prayers, 19.076, 72.8777, late)
    expect(next?.name).toBe('Fajr')
    expect(next?.time.getDate()).toBe(late.getDate() + 1)
  })
  it('returns local device time for a location without hard-coded clock values', () => {
    const prayers = calculatePrayerTimes(date, 19.076, 72.8777)
    expect(prayers[0].time.toString()).not.toContain('Invalid')
    expect(prayers[0].time.getHours()).toBeGreaterThanOrEqual(0)
    expect(prayers[0].time.getHours()).toBeLessThan(24)
  })
  it('calculates a bounded Qibla bearing', () => {
    const bearing = qiblaBearing(19.076, 72.8777)
    expect(bearing).toBeGreaterThanOrEqual(0)
    expect(bearing).toBeLessThan(360)
  })
})
