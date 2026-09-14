import { describe, expect, it } from 'vitest'
import { calculatePrayerTimes, currentPrayer, nextPrayer, nightMidpoint, prayerTimeLabel, qiblaBearing, type PrayerSettings } from './prayer'

const indiaDate = new Date('2026-09-14T12:00:00Z')

function byName(name: string, prayers: ReturnType<typeof calculatePrayerTimes>) { return prayers.find(item => item.name === name)?.time ?? null }

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
    expect(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'short' }).format(winter[2]!.time)).toContain('EST')
    expect(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'short' }).format(summer[2]!.time)).toContain('EDT')
    expect(winter[2]!.time.getTime()).not.toBe(summer[2]!.time.getTime())
  })

  it('supports all seven published calculation conventions', () => {
    for (const method of ['MWL', 'ISNA', 'Egypt', 'Makkah', 'Karachi', 'Tehran', 'Jafari'] as const) {
      const prayers = calculatePrayerTimes(indiaDate, 19.076, 72.8777, 'Asia/Kolkata', { method })
      expect(prayers.length).toBeGreaterThanOrEqual(5)
      expect(byName('Fajr', prayers)).not.toBeNull()
      expect(byName('Isha', prayers)).not.toBeNull()
    }
  })

  it('uses Hanafi shadow factor for Asr', () => {
    const standard = byName('Asr', calculatePrayerTimes(indiaDate, 19.076, 72.8777, 'Asia/Kolkata', { asrMethod: 'standard' }))!
    const hanafi = byName('Asr', calculatePrayerTimes(indiaDate, 19.076, 72.8777, 'Asia/Kolkata', { asrMethod: 'hanafi' }))!
    expect(hanafi.getTime()).toBeGreaterThan(standard.getTime())
  })

  it('supports legacy hanafi boolean input for compatibility', () => {
    const legacy = byName('Asr', calculatePrayerTimes(indiaDate, 19.076, 72.8777, 'Asia/Kolkata', { hanafi: true }))!
    const explicit = byName('Asr', calculatePrayerTimes(indiaDate, 19.076, 72.8777, 'Asia/Kolkata', { asrMethod: 'hanafi' }))!
    expect(legacy.getTime()).toBe(explicit.getTime())
  })

  it('applies minute adjustments without changing canonical sunrise', () => {
    const settings: PrayerSettings = { adjustments: { Fajr: 5, Dhuhr: -2, Asr: 3, Maghrib: 4, Isha: -6 } }
    const base = calculatePrayerTimes(indiaDate, 19.076, 72.8777, 'Asia/Kolkata')
    const adjusted = calculatePrayerTimes(indiaDate, 19.076, 72.8777, 'Asia/Kolkata', settings)
    expect(byName('Fajr', adjusted)!.getTime() - byName('Fajr', base)!.getTime()).toBe(5 * 60000)
    expect(byName('Sunrise', adjusted)!.getTime()).toBe(byName('Sunrise', base)!.getTime())
    expect(byName('Isha', adjusted)!.getTime() - byName('Isha', base)!.getTime()).toBe(-6 * 60000)
  })

  it('uses high-latitude fallbacks when twilight angles are unavailable', () => {
    const date = new Date('2026-06-21T12:00:00Z')
    const raw = calculatePrayerTimes(date, 64.1466, -21.9426, 'Atlantic/Reykjavik', { highLatitude: 'none' })
    const fallback = calculatePrayerTimes(date, 64.1466, -21.9426, 'Atlantic/Reykjavik', { highLatitude: 'oneSeventh' })
    expect(fallback.length).toBeGreaterThanOrEqual(raw.length)
    expect(byName('Fajr', fallback)).not.toBeNull()
    expect(byName('Isha', fallback)).not.toBeNull()
    expect(byName('Fajr', fallback)!.getTime()).toBeLessThan(byName('Sunrise', fallback)!.getTime())
    expect(byName('Isha', fallback)!.getTime()).toBeGreaterThan(byName('Maghrib', fallback)!.getTime())
  })

  it('keeps a graceful unavailable state when polar sunrise/sunset boundaries do not exist', () => {
    const prayers = calculatePrayerTimes(new Date('2026-06-21T12:00:00Z'), 90, 0, 'UTC', { highLatitude: 'middleOfNight' })
    expect(prayers.some(p => p.name === 'Sunrise')).toBe(false)
    expect(prayers.some(p => p.name === 'Maghrib')).toBe(false)
    expect(prayers.some(p => p.name === 'Fajr')).toBe(false)
    expect(prayers.some(p => p.name === 'Isha')).toBe(false)
  })

  it('derives a night midpoint from Maghrib to tomorrow Fajr', () => {
    const midpoint = nightMidpoint(indiaDate, 19.076, 72.8777, 'Asia/Kolkata')
    expect(midpoint).not.toBeNull()
    expect(midpoint!.getTime()).toBeGreaterThan(byName('Maghrib', calculatePrayerTimes(indiaDate, 19.076, 72.8777, 'Asia/Kolkata'))!.getTime())
  })

  it('formats prayer times in 12h and 24h modes from the same instant', () => {
    const fajr = byName('Fajr', calculatePrayerTimes(indiaDate, 19.076, 72.8777, 'Asia/Kolkata'))!
    expect(prayerTimeLabel(fajr, 'Asia/Kolkata', false)).toMatch(/\d{1,2}:\d{2}\s(?:AM|PM)/)
    expect(prayerTimeLabel(fajr, 'Asia/Kolkata', true)).toMatch(/\d{2}:\d{2}/)
  })

  it('calculates a bounded Kaaba bearing', () => {
    const bearing = qiblaBearing(19.076, 72.8777)
    expect(bearing).toBeGreaterThanOrEqual(0)
    expect(bearing).toBeLessThan(360)
  })

  it('rejects invalid inputs instead of inventing times', () => {
    expect(calculatePrayerTimes(indiaDate, 95, 10, 'UTC')).toEqual([])
    expect(calculatePrayerTimes(indiaDate, 10, 190, 'UTC')).toEqual([])
    expect(calculatePrayerTimes(new Date('invalid'), 10, 10, 'UTC')).toEqual([])
    expect(calculatePrayerTimes(indiaDate, 10, 10, '')).toEqual([])
  })
})
