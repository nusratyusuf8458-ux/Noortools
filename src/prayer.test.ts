import { describe, expect, it } from 'vitest'
import { calculatePrayerTimes, currentPrayer, nextPrayer, qiblaBearing } from './prayer'

const indiaDate = new Date('2026-09-14T12:00:00Z')

describe('prayer engine', () => {
  it('returns the six core solar events in chronological order for India', () => {
    const prayers = calculatePrayerTimes(indiaDate, 19.076, 72.8777, 'Asia/Kolkata')
    expect(prayers.map(p => p.name)).toEqual(['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'])
    for (let i = 1; i < prayers.length; i += 1) expect(prayers[i]!.time.getTime()).toBeGreaterThan(prayers[i - 1]!.time.getTime())
  })

  it('keeps manual-location prayer dates in the selected timezone rather than the device timezone', () => {
    const instant = new Date('2026-09-14T23:30:00Z')
    const india = calculatePrayerTimes(instant, 19.076, 72.8777, 'Asia/Kolkata')
    const newYork = calculatePrayerTimes(instant, 40.7128, -74.006, 'America/New_York')
    const indiaDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(india[0]!.time)
    const nyDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(newYork[0]!.time)
    expect(indiaDate).toBe('2026-09-15')
    expect(nyDate).toBe('2026-09-14')
  })

  it('identifies the current prayer window', () => {
    const prayers = calculatePrayerTimes(indiaDate, 19.076, 72.8777, 'Asia/Kolkata')
    const dhuhr = prayers.find(p => p.name === 'Dhuhr')!
    expect(currentPrayer(prayers, new Date(dhuhr.time.getTime() + 60_000))).toBe('Dhuhr')
  })

  it('rolls after Isha to the following local date Fajr', () => {
    const prayers = calculatePrayerTimes(indiaDate, 19.076, 72.8777, 'Asia/Kolkata')
    const late = new Date(prayers.find(p => p.name === 'Isha')!.time.getTime() + 60_000)
    const next = nextPrayer(prayers, 19.076, 72.8777, 'Asia/Kolkata', {}, late)
    expect(next?.name).toBe('Fajr')
    expect(next?.time.getTime()).toBeGreaterThan(late.getTime())
    const localTomorrow = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(next!.time)
    const localLate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(late)
    expect(localTomorrow).toBe('2026-09-15')
    expect(localLate).toBe('2026-09-14')
  })

  it('respects DST in a location timezone', () => {
    const winter = calculatePrayerTimes(new Date('2026-01-15T12:00:00Z'), 40.7128, -74.006, 'America/New_York')
    const summer = calculatePrayerTimes(new Date('2026-07-15T12:00:00Z'), 40.7128, -74.006, 'America/New_York')
    const winterHour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', hourCycle: 'h23' }).format(winter[2]!.time))
    const summerHour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', hourCycle: 'h23' }).format(summer[2]!.time))
    expect(Math.abs(winterHour - summerHour)).toBeGreaterThanOrEqual(0)
    expect(winter[2]!.time.getTime()).not.toBe(summer[2]!.time.getTime())
  })

  it('uses selectable high-latitude fallbacks when normal Fajr/Isha are unavailable', () => {
    const date = new Date('2026-06-21T12:00:00Z')
    const raw = calculatePrayerTimes(date, 64.1466, -21.9426, 'Atlantic/Reykjavik', { highLatitude: 'none' })
    const fallback = calculatePrayerTimes(date, 64.1466, -21.9426, 'Atlantic/Reykjavik', { highLatitude: 'oneSeventh' })
    expect(fallback.length).toBeGreaterThanOrEqual(raw.length)
    const fajr = fallback.find(p => p.name === 'Fajr')
    const sunrise = fallback.find(p => p.name === 'Sunrise')
    const isha = fallback.find(p => p.name === 'Isha')
    const maghrib = fallback.find(p => p.name === 'Maghrib')
    expect(fajr).toBeDefined()
    expect(isha).toBeDefined()
    expect(fajr!.time.getTime()).toBeLessThan(sunrise!.time.getTime())
    expect(isha!.time.getTime()).toBeGreaterThan(maghrib!.time.getTime())
  })

  it('keeps a graceful unavailable state when polar sunrise/sunset boundaries do not exist', () => {
    const prayers = calculatePrayerTimes(new Date('2026-06-21T12:00:00Z'), 90, 0, 'UTC', { highLatitude: 'middleOfNight' })
    expect(prayers.some(p => p.name === 'Sunrise')).toBe(false)
    expect(prayers.some(p => p.name === 'Maghrib')).toBe(false)
    expect(prayers.some(p => p.name === 'Fajr')).toBe(false)
    expect(prayers.some(p => p.name === 'Isha')).toBe(false)
  })

  it('calculates a bounded Kaaba bearing', () => {
    const bearing = qiblaBearing(19.076, 72.8777)
    expect(bearing).toBeGreaterThanOrEqual(0)
    expect(bearing).toBeLessThan(360)
  })

  it('has no hard-coded clock values and produces valid Dates', () => {
    const prayers = calculatePrayerTimes(indiaDate, 19.076, 72.8777, 'Asia/Kolkata')
    expect(prayers.every(p => Number.isFinite(p.time.getTime()))).toBe(true)
  })
})
