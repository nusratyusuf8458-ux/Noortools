import { describe, expect, it } from 'vitest'
import { filterSearchResults, normalizeSearchText, searchEmptyState, searchMatches } from './searchModel'

describe('Phase-2.4 search model', () => {
  it('matches case-insensitively and ignores combining marks without mutating source text', () => {
    const source = 'ٱلْحَمْدُ لِلَّهِ'
    expect(searchMatches(source, 'الحمد')).toBe(true)
    expect(source).toBe('ٱلْحَمْدُ لِلَّهِ')
    expect(normalizeSearchText('Allah')).toBe(normalizeSearchText('allah'))
  })

  it('filters only the selected content type', () => {
    const results = [{ type: 'quran' as const, id: 'q' }, { type: 'names' as const, id: 'n' }, { type: 'duas' as const, id: 'd' }, { type: 'azkar' as const, id: 'a' }]
    expect(filterSearchResults(results, 'quran').map(item => item.id)).toEqual(['q'])
    expect(filterSearchResults(results, 'all').map(item => item.id)).toEqual(['q', 'n', 'd', 'a'])
  })

  it('distinguishes idle, results, and no-result search states', () => {
    expect(searchEmptyState('   ', 0)).toBe('idle')
    expect(searchEmptyState('Allah', 2)).toBe('results')
    expect(searchEmptyState('missing', 0)).toBe('no-results')
  })
})
