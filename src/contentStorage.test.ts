import { beforeEach, describe, expect, it } from 'vitest'
import { azkarHistoryDates, bookmarkCount, isAzkarCompleted, loadContentState, recordAzkarCount, recordQuranProgress, resetAzkarDay, resetContentState, saveContentState, setItemProgress, toggleBookmark } from './contentStorage'

beforeEach(() => localStorage.clear())

describe('Phase-2.2 local content state', () => {
  it('starts empty and never seeds progress, Azkar activity or bookmarks', () => {
    const state = loadContentState()
    expect(state.version).toBe(2)
    expect(bookmarkCount(state)).toBe(0)
    expect(state.quran.lastReadId).toBeNull()
    expect(state.quran.positions).toEqual({})
    expect(state.itemProgress).toEqual({})
    expect(state.azkarDaily).toEqual({})
  })

  it('persists stable-id bookmarks and removes them on toggle', () => {
    const state = loadContentState()
    const saved = toggleBookmark(state, 'allah-name:1', 'allah_name', new Date('2026-09-14T00:00:00Z'))
    saveContentState(saved)
    expect(loadContentState().bookmarks['allah-name:1']).toEqual({ id: 'allah-name:1', type: 'allah_name', addedAt: '2026-09-14T00:00:00.000Z' })
    expect(bookmarkCount(toggleBookmark(saved, 'allah-name:1', 'allah_name'))).toBe(0)
  })

  it('records genuine Quran reading position only for valid numbers', () => {
    const state = loadContentState()
    const next = recordQuranProgress(state, 2, 255, new Date('2026-09-14T00:00:00Z'))
    expect(next.quran.lastReadId).toBe('quran:2')
    expect(next.quran.positions['quran:2']).toEqual({ ayah: 255, updatedAt: '2026-09-14T00:00:00.000Z' })
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

  it('migrates v1 state and drops malformed values', () => {
    localStorage.setItem('noortools:content:v1', JSON.stringify({ version: 999, bookmarks: { bad: { type: 'made-up', addedAt: 3 } }, quran: { positions: { a: { ayah: -1 } } }, itemProgress: { x: { completed: 9, target: 1 } } }))
    const state = loadContentState()
    expect(state.version).toBe(2)
    expect(state.bookmarks).toEqual({})
    expect(state.quran.positions).toEqual({})
    expect(state.itemProgress).toEqual({})
    expect(state.azkarDaily).toEqual({})
    expect(resetContentState().bookmarks).toEqual({})
  })
})
