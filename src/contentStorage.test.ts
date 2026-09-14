import { beforeEach, describe, expect, it } from 'vitest'
import { bookmarkCount, loadContentState, recordQuranProgress, resetContentState, saveContentState, setItemProgress, toggleBookmark } from './contentStorage'

beforeEach(() => localStorage.clear())

describe('Phase-2 local content state', () => {
  it('starts empty and never seeds progress or bookmarks', () => {
    const state = loadContentState()
    expect(state.version).toBe(1)
    expect(bookmarkCount(state)).toBe(0)
    expect(state.quran.lastReadId).toBeNull()
    expect(state.quran.positions).toEqual({})
    expect(state.itemProgress).toEqual({})
  })

  it('persists stable-id bookmarks and removes them on toggle', () => {
    const state = loadContentState()
    const saved = toggleBookmark(state, 'quran:2:255', 'quran_ayah', new Date('2026-09-14T00:00:00Z'))
    expect(saved.bookmarks['quran:2:255']).toEqual({ id: 'quran:2:255', type: 'quran_ayah', addedAt: '2026-09-14T00:00:00.000Z' })
    saveContentState(saved)
    expect(bookmarkCount(loadContentState())).toBe(1)
    expect(bookmarkCount(toggleBookmark(saved, 'quran:2:255', 'quran_ayah'))).toBe(0)
  })

  it('records genuine Quran reading position only for valid surah and ayah numbers', () => {
    const state = loadContentState()
    const next = recordQuranProgress(state, 2, 255, new Date('2026-09-14T00:00:00Z'))
    expect(next.quran.lastReadId).toBe('quran:2')
    expect(next.quran.positions['quran:2']).toEqual({ ayah: 255, updatedAt: '2026-09-14T00:00:00.000Z' })
    expect(recordQuranProgress(state, 115, 1)).toBe(state)
    expect(recordQuranProgress(state, 1, 0)).toBe(state)
  })

  it('persists bounded completion/progress for count-based content', () => {
    const state = loadContentState()
    const next = setItemProgress(state, 'azkar:example', 3, 7, new Date('2026-09-14T00:00:00Z'))
    expect(next.itemProgress['azkar:example']).toEqual({ completed: 3, target: 7, updatedAt: '2026-09-14T00:00:00.000Z' })
    expect(setItemProgress(state, 'azkar:example', 8, 7)).toBe(state)
    expect(setItemProgress(state, '', 1, 7)).toBe(state)
  })

  it('drops malformed persisted records rather than crashing', () => {
    localStorage.setItem('noortools:content:v1', JSON.stringify({ version: 999, bookmarks: { bad: { type: 'made-up', addedAt: 3 } }, quran: { positions: { a: { ayah: -1 } } }, itemProgress: { x: { completed: 9, target: 1 } } }))
    const state = loadContentState()
    expect(state.version).toBe(1)
    expect(state.bookmarks).toEqual({})
    expect(state.quran.positions).toEqual({})
    expect(state.itemProgress).toEqual({})
    expect(resetContentState().bookmarks).toEqual({})
  })
})
