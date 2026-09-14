import { beforeEach, describe, expect, it } from 'vitest'
import { loadState, localDateKey, resetState, saveState, salahStats, tasbihStats } from './storage'

describe('local storage', () => {
  beforeEach(() => localStorage.clear())

  it('starts with no location or fake activity', () => {
    const initial = loadState()
    expect(initial.version).toBe(2)
    expect(initial.location).toBeNull()
    expect(initial.salah).toEqual({})
    expect(initial.tasbih.total).toBe(0)
    expect(initial.tasbih.sessions).toEqual([])
  })

  it('persists real activity and resets it', () => {
    const initial = loadState()
    const next = { ...initial, tasbih: { ...initial.tasbih, count: 3, total: 3, sessions: [{ date: '2026-09-14', count: 3, target: 33, dhikr: 'SubhanAllah' }] } }
    saveState(next)
    expect(loadState().tasbih.total).toBe(3)
    expect(loadState().tasbih.sessions).toHaveLength(1)
    expect(resetState().tasbih.total).toBe(0)
  })

  it('defensively handles corrupt and malformed data', () => {
    localStorage.setItem('noortools:v2', 'not-json')
    expect(loadState().location).toBeNull()
    localStorage.setItem('noortools:v2', JSON.stringify({ version: 2, location: { lat: 999, lon: 2, label: 'bad' }, tasbih: { total: -1 } }))
    const recovered = loadState()
    expect(recovered.location).toBeNull()
    expect(recovered.tasbih.total).toBe(-1)
  })

  it('migrates the previous version without seeding activity', () => {
    localStorage.setItem('noortools:v1', JSON.stringify({ version: 1, location: null, salah: {}, tasbih: { count: 2, target: 33, dhikr: 'SubhanAllah', sessions: 4, total: 9 } }))
    const migrated = loadState()
    expect(migrated.version).toBe(2)
    expect(migrated.tasbih.count).toBe(2)
    expect(migrated.tasbih.total).toBe(9)
    expect(migrated.tasbih.sessions).toEqual([])
  })

  it('uses the local calendar date, not UTC date', () => {
    const value = new Date(2026, 8, 14, 23, 59)
    expect(localDateKey(value)).toBe('2026-09-14')
  })

  it('calculates real Salah and Tasbih streaks and windows', () => {
    const salah = {
      '2026-09-12': { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true },
      '2026-09-13': { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true },
      '2026-09-14': { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true },
    }
    expect(salahStats(salah, new Date(2026, 8, 14, 12)).streak).toBe(3)
    expect(salahStats({ '2026-09-14': { Fajr: true } }, new Date(2026, 8, 14, 12)).streak).toBe(0)
    const sessions = [
      { date: '2026-09-12', count: 10, target: 33, dhikr: 'SubhanAllah' },
      { date: '2026-09-13', count: 20, target: 33, dhikr: 'SubhanAllah' },
      { date: '2026-09-14', count: 30, target: 33, dhikr: 'SubhanAllah' },
    ]
    const stats = tasbihStats(sessions, new Date(2026, 8, 14, 12))
    expect(stats.today).toBe(30)
    expect(stats.last7).toBe(60)
    expect(stats.streak).toBe(3)
  })
})
