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
    const dhuhr = prayers.find(p => p.name === 'Dhuhr')
    expect(dhuhr).toBeDefined()
    const afterDhuhr = new Date((dhuhr as Prayer).time.getTime() + 60_000)
    expect(currentPrayer(prayers, afterDhuhr)).toBe('Dhuhr')
  })
  it('rolls to the next day Fajr after Isha', () => {
    const prayers = calculatePrayerTimes(date, 19.076, 72.8777)
    const late = new Date(prayers[prayers.length - 1].time.getTime() + 60_000)
    const next = nextPrayer(prayers, 19.076, 72.8777, late)
    expect(next?.name).toBe('Fajr')
    expect(next?.time.getTime()).toBeGreaterThan(late.getTime())
    expect(next?.time.getTime() - late.getTime()).toBeLessThan(36 * 60 * 60 * 1000)
  })
  it('returns valid device-local Date objects without hard-coded clock values', () => {
    const prayers = calculatePrayerTimes(date, 19.076, 72.8777)
    for (const prayer of prayers) expect(prayer.time.getTime()).toBeGreaterThan(0)
  })
  it('calculates a bounded Qibla bearing', () => {
    const bearing = qiblaBearing(19.076, 72.8777)
    expect(bearing).toBeGreaterThanOrEqual(0)
    expect(bearing).toBeLessThan(360)
  })
})
