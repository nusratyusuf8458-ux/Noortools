import { beforeEach, describe, expect, it } from 'vitest'
import { exportData, loadState, localDateKey, parseImportedData, resetState, saveState, salahStats, tasbihStats } from './storage'

describe('local storage', () => {
  beforeEach(() => localStorage.clear())

  it('starts with schema v3, no location and no fake activity', () => {
    const initial = loadState()
    expect(initial.version).toBe(3)
    expect(initial.location).toBeNull()
    expect(initial.salah).toEqual({})
    expect(initial.tasbih.total).toBe(0)
    expect(initial.tasbih.sessions).toEqual([])
  })

  it('persists real activity and resets it', () => {
    const initial = loadState()
    const next = { ...initial, location: { lat: 19.076, lon: 72.8777, label: 'Mumbai', timeZone: 'Asia/Kolkata' }, tasbih: { ...initial.tasbih, count: 3, total: 3, sessions: [{ date: '2026-09-14', count: 3, target: 33, dhikr: 'SubhanAllah' }] } }
    saveState(next)
    expect(loadState().tasbih.total).toBe(3)
    expect(loadState().tasbih.sessions).toHaveLength(1)
    expect(resetState().tasbih.total).toBe(0)
  })

  it('defensively handles corrupt and malformed local data', () => {
    localStorage.setItem('noortools:v3', 'not-json')
    expect(loadState().location).toBeNull()
    localStorage.setItem('noortools:v3', JSON.stringify({ version: 3, location: { lat: 999, lon: 2, label: 'bad' }, tasbih: { total: -1 } }))
    const recovered = loadState()
    expect(recovered.location).toBeNull()
    expect(recovered.tasbih.total).toBe(0)
  })

  it('migrates v1 and v2 into v3 without inventing session history', () => {
    localStorage.setItem('noortools:v1', JSON.stringify({ version: 1, location: null, salah: {}, tasbih: { count: 2, target: 33, dhikr: 'SubhanAllah', sessions: 3, total: 9 } }))
    const migratedV1 = loadState()
    expect(migratedV1.version).toBe(3)
    expect(migratedV1.tasbih.count).toBe(2)
    expect(migratedV1.tasbih.total).toBe(9)
    expect(migratedV1.tasbih.sessions).toEqual([])
    localStorage.clear()
    localStorage.setItem('noortools:v2', JSON.stringify({ version: 2, location: { lat: 19.076, lon: 72.8777, label: 'Mumbai' }, salah: {}, tasbih: { count: 4, total: 12 } }))
    expect(loadState().version).toBe(3)
    expect(loadState().location?.timeZone).toBeNull()
  })

  it('exports only local app data with an explicit schema version', () => {
    const state = loadState()
    state.location = { lat: 19.076, lon: 72.8777, label: 'Mumbai', timeZone: 'Asia/Kolkata' }
    state.tasbih.total = 5
    const parsed = JSON.parse(exportData(state))
    expect(parsed.schema).toBe('noortools.local-data')
    expect(parsed.version).toBe(3)
    expect(parsed.data.location.timeZone).toBe('Asia/Kolkata')
    expect(parsed.theme).toBeUndefined()
    expect(parsed.data.secret).toBeUndefined()
  })

  it('validates imports and does not accept arbitrary JSON', () => {
    expect(() => parseImportedData('{"hello":"world"}')).toThrow()
    expect(() => parseImportedData('not json')).toThrow()
    const imported = parseImportedData(exportData(loadState()))
    expect(imported.version).toBe(3)
    expect(imported.salah).toEqual({})
  })

  it('migrates an imported v1 export safely', () => {
    const legacyExport = JSON.stringify({ schema: 'noortools.local-data', version: 1, data: { location: null, salah: {}, tasbih: { count: 2, target: 33, dhikr: 'SubhanAllah', sessions: 3, total: 7 } } })
    const imported = parseImportedData(legacyExport)
    expect(imported.version).toBe(3)
    expect(imported.tasbih.count).toBe(2)
    expect(imported.tasbih.sessions).toEqual([])
  })

  it('rejects oversized imports', () => {
    expect(() => parseImportedData('x'.repeat(2_000_001))).toThrow()
  })

  it('uses selected timezone for calendar date keys', () => {
    const instant = new Date('2026-09-14T23:30:00Z')
    expect(localDateKey(instant, 'Asia/Kolkata')).toBe('2026-09-15')
    expect(localDateKey(instant, 'America/New_York')).toBe('2026-09-14')
  })

  it('uses selected timezone for activity windows and streaks', () => {
    const instant = new Date('2026-09-14T23:30:00Z')
    const salah = { '2026-09-14': { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true }, '2026-09-15': { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true } }
    expect(salahStats(salah, instant, 'Asia/Kolkata').todayCompleted).toBe(5)
    expect(salahStats(salah, instant, 'Asia/Kolkata').streak).toBe(2)
    const sessions = [{ date: '2026-09-14', count: 10, target: 33, dhikr: 'SubhanAllah' }, { date: '2026-09-15', count: 20, target: 33, dhikr: 'SubhanAllah' }]
    expect(tasbihStats(sessions, instant, 'Asia/Kolkata').today).toBe(20)
    expect(tasbihStats(sessions, instant, 'Asia/Kolkata').streak).toBe(2)
  })

  it('calculates real Salah and Tasbih streaks and windows', () => {
    const salah = { '2026-09-12': { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true }, '2026-09-13': { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true }, '2026-09-14': { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true } }
    expect(salahStats(salah, new Date(2026, 8, 14, 12)).streak).toBe(3)
    expect(salahStats({ '2026-09-14': { Fajr: true } }, new Date(2026, 8, 14, 12)).streak).toBe(0)
    const sessions = [{ date: '2026-09-12', count: 10, target: 33, dhikr: 'SubhanAllah' }, { date: '2026-09-13', count: 20, target: 33, dhikr: 'SubhanAllah' }, { date: '2026-09-14', count: 30, target: 33, dhikr: 'SubhanAllah' }]
    const stats = tasbihStats(sessions, new Date(2026, 8, 14, 12))
    expect(stats.today).toBe(30)
    expect(stats.last7).toBe(60)
    expect(stats.streak).toBe(3)
  })
})
