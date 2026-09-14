import { beforeEach, describe, expect, it } from 'vitest'
import { addSearchHistory, clearSearchHistory, loadSearchHistory, SEARCH_HISTORY_MAX } from './searchHistory'

beforeEach(() => localStorage.clear())

describe('Phase-2.4 search history', () => {
  it('starts empty and persists newest-first searches without duplicates', () => {
    let history = loadSearchHistory()
    expect(history).toEqual([])
    history = addSearchHistory(history, '  Allah  ')
    history = addSearchHistory(history, 'Quran')
    history = addSearchHistory(history, 'allah')
    expect(history).toEqual(['allah', 'Quran'])
    expect(loadSearchHistory()).toEqual(['allah', 'Quran'])
  })

  it('caps history and rejects malformed values', () => {
    let history = loadSearchHistory()
    for (let i = 0; i < SEARCH_HISTORY_MAX + 5; i += 1) history = addSearchHistory(history, `query ${i}`)
    expect(history).toHaveLength(SEARCH_HISTORY_MAX)
    localStorage.setItem('noortools:search-history:v1', JSON.stringify(['ok', 7, null, '\u0000bad', 'ok']))
    expect(loadSearchHistory()).toEqual(['ok', 'bad'])
  })

  it('clears history locally', () => {
    addSearchHistory([], 'Quran')
    expect(loadSearchHistory()).toEqual(['Quran'])
    clearSearchHistory()
    expect(loadSearchHistory()).toEqual([])
  })
})
