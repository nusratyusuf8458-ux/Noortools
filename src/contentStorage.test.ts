import { beforeEach, describe, expect, it } from 'vitest'
import { azkarHistoryDates, bookmarkCount, isAzkarCompleted, loadContentState, quranActivityDays, quranReadCount, recordAzkarCount, recordQuranProgress, resetAzkarDay, resetContentState, saveContentState, saveNote, setReminderPreferences, setItemProgress, toggleBookmark, toggleFavorite } from './contentStorage'

beforeEach(() => localStorage.clear())

describe('Phase-2.4 local content state', () => {
  it('starts empty and never seeds progress, notes, reminders or bookmarks', () => {
    const state = loadContentState()
    expect(state.version).toBe(3)
    expect(bookmarkCount(state)).toBe(0)
    expect(state.quran.lastReadId).toBeNull()
    expect(state.quran.positions).toEqual({})
    expect(state.quran.readAyahs).toEqual({})
    expect(state.quran.history).toEqual([])
    expect(quranActivityDays(state)).toBe(0)
    expect(state.notes).toEqual({})
    expect(state.reminders.notificationsEnabled).toBe(false)
    expect(Object.values(state.reminders.items).every(item => !item.enabled)).toBe(true)
  })

  it('persists stable-id bookmarks and removes them on toggle', () => {
    const state = loadContentState()
    const saved = toggleBookmark(state, 'allah-name:1', 'allah_name', new Date('2026-09-14T00:00:00Z'))
    saveContentState(saved)
    expect(loadContentState().bookmarks['allah-name:1']).toEqual({ id: 'allah-name:1', type: 'allah_name', addedAt: '2026-09-14T00:00:00.000Z', favorite: false })
    expect(toggleFavorite(saved, 'allah-name:1').bookmarks['allah-name:1'].favorite).toBe(true)
    expect(toggleFavorite(toggleFavorite(saved, 'allah-name:1'), 'new-id', 'dua').bookmarks['new-id'].favorite).toBe(true)
    expect(bookmarkCount(toggleBookmark(saved, 'allah-name:1', 'allah_name'))).toBe(0)
  })

  it('records genuine Quran activity only when explicitly saved', () => {
    const state = loadContentState()
    const next = recordQuranProgress(state, 2, 255, new Date('2026-09-14T00:00:00Z'), '2026-09-14')
    expect(next.quran.lastReadId).toBe('quran:2:255')
    expect(next.quran.positions['quran:2']).toEqual({ ayah: 255, updatedAt: '2026-09-14T00:00:00.000Z' })
    expect(next.quran.readAyahs['quran:2:255']).toBe('2026-09-14T00:00:00.000Z')
    expect(next.quran.history).toHaveLength(1)
    expect(next.quran.activityDates['2026-09-14']).toBe(1)
    expect(quranReadCount(next)).toBe(1)
    expect(quranActivityDays(next)).toBe(1)
    expect(recordQuranProgress(state, 115, 1)).toBe(state)
    expect(recordQuranProgress(state, 1, 0)).toBe(state)
  })

  it('persists bounded count progress and rejects invalid values', () => {
    const state = loadContentState()
    const next = setItemProgress(state, 'dua:test', 3, 7, new Date('2026-09-14T00:00:00Z'))
    expect(next.itemProgress['dua:test']).toEqual({ completed: 3, target: 7, updatedAt: '2026-09-14T00:00:00.000Z' })
    expect(setItemProgress(state, 'dua:test', 8, 7)).toBe(state)
    expect(setItemProgress(state, '', 1, 7)).toBe(state)
  })

  it('stores user notes separately from source content', () => {
    const state = loadContentState()
    const next = saveNote(state, 'quran:2:255', 'quran_ayah', 'My personal reflection', new Date('2026-09-14T00:00:00Z'))
    expect(next.notes['note:quran_ayah:quran:2:255']).toMatchObject({ contentId: 'quran:2:255', contentType: 'quran_ayah', text: 'My personal reflection' })
    expect(saveNote(next, 'quran:2:255', 'quran_ayah', 'Updated', new Date('2026-09-14T01:00:00Z')).notes['note:quran_ayah:quran:2:255'].createdAt).toBe('2026-09-14T00:00:00.000Z')
    expect(saveNote(state, 'dua:1', 'dua', '   ')).toBe(state)
  })

  it('stores reminder enablement and validates time format', () => {
    const state = loadContentState()
    const next = setReminderPreferences(state, { notificationsEnabled: true, permission: 'granted', item: { quranReading: { enabled: true, time: '21:15' }, tasbih: { enabled: true, time: '20:45' } } })
    expect(next.reminders.notificationsEnabled).toBe(true)
    expect(next.reminders.permission).toBe('granted')
    expect(next.reminders.items.quranReading).toEqual({ enabled: true, time: '21:15' })
    expect(next.reminders.items.tasbih).toEqual({ enabled: true, time: '20:45' })
    const invalid = setReminderPreferences(next, { item: { quranReading: { time: '99:99' } } })
    expect(invalid.reminders.items.quranReading.time).toBe('21:15')
  })

  it('records real Azkar progress, completion, history and reset', () => {
    const state = loadContentState()
    const date = '2026-09-14'
    const once = recordAzkarCount(state, date, 'azkar:seen-arabic:1', 1)
    const thrice = recordAzkarCount(once, date, 'azkar:seen-arabic:2', 3)
    expect(thrice.azkarDaily[date]).toEqual({ 'azkar:seen-arabic:1': 1, 'azkar:seen-arabic:2': 3 })
    expect(isAzkarCompleted(thrice, date, 'azkar:seen-arabic:1', 1)).toBe(true)
    expect(isAzkarCompleted(thrice, date, 'azkar:seen-arabic:2', 5)).toBe(false)
    expect(azkarHistoryDates(thrice)).toEqual([date])
    expect(resetAzkarDay(thrice, date).azkarDaily).toEqual({})
  })

  it('migrates v2 state to v3 without inventing user activity', () => {
    localStorage.setItem('noortools:content:v2', JSON.stringify({ version: 2, bookmarks: { bad: { type: 'made-up', addedAt: 3 }, good: { type: 'dua', addedAt: '2026-09-13T00:00:00.000Z' } }, quran: { positions: { 'quran:2': { ayah: 255, updatedAt: '2026-09-13T00:00:00.000Z' } }, lastReadId: 'quran:2' }, itemProgress: { x: { completed: 9, target: 1 } }, azkarDaily: {} }))
    const state = loadContentState()
    expect(state.version).toBe(3)
    expect(state.bookmarks.good).toMatchObject({ id: 'good', type: 'dua', favorite: false })
    expect(state.quran.positions['quran:2']).toEqual({ ayah: 255, updatedAt: '2026-09-13T00:00:00.000Z' })
    expect(state.quran.readAyahs).toEqual({})
    expect(state.quran.history).toEqual([])
    expect(state.quran.activityDates).toEqual({})
    expect(state.notes).toEqual({})
    expect(resetContentState().bookmarks).toEqual({})
  })
})