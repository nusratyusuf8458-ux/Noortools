import { beforeEach, describe, expect, it } from 'vitest'
import { loadState, parseImportedData, saveState } from './storage'

describe('Phase 3A prayer storage', () => {
  beforeEach(() => localStorage.clear())

  it('migrates an existing v3 state while adding safe prayer defaults', () => {
    localStorage.setItem('noortools:v3', JSON.stringify({ version: 3, location: { lat: 19.076, lon: 72.8777, label: 'Mumbai', timeZone: 'Asia/Kolkata' }, prayerSettings: { method: 'MWL', hanafi: true, highLatitude: 'none' }, salah: {}, tasbih: { count: 0, target: 33, dhikr: 'SubhanAllah', sessions: [], total: 0, haptic: true, sound: false } }))
    const state = loadState()
    expect(state.prayerSettings.method).toBe('MWL')
    expect(state.prayerSettings.asrMethod).toBe('hanafi')
    expect(state.prayerSettings.timeFormat).toBe('12h')
    expect(state.prayerSettings.adjustments).toEqual({})
  })

  it('round-trips extended prayer settings without leaking invalid values', () => {
    const state = loadState()
    const updated = { ...state, prayerSettings: { ...state.prayerSettings, method: 'Karachi' as const, asrMethod: 'hanafi' as const, hanafi: true, highLatitude: 'angleBased' as const, adjustments: { Fajr: 7, Isha: -5 }, timeFormat: '24h' as const } }
    saveState(updated)
    const restored = loadState()
    expect(restored.prayerSettings).toEqual(updated.prayerSettings)
  })

  it('accepts supported imported data and rejects malformed JSON or oversized input', () => {
    const good = JSON.stringify({ schema: 'noortools.local-data', version: 3, data: { location: null, prayerSettings: { method: 'ISNA', hanafi: false, highLatitude: 'none' }, salah: {}, tasbih: { count: 0, target: 33, dhikr: 'SubhanAllah', sessions: [], total: 0, haptic: true, sound: false } } })
    expect(parseImportedData(good).prayerSettings.method).toBe('ISNA')
    expect(() => parseImportedData('{bad')).toThrow('valid JSON')
    expect(() => parseImportedData('x'.repeat(2_000_001))).toThrow('too large')
  })
})
