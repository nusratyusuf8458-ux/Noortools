import { describe, expect, it } from 'vitest'
import { findHighlightRanges, highlightText } from './searchPresentation'

describe('Phase-2.4 search highlighting', () => {
  it('highlights multiple matches without changing source text', () => {
    const source = 'Allah loves Allah'
    expect(highlightText(source, 'Allah')).toEqual([
      { text: 'Allah', match: true },
      { text: ' loves ', match: false },
      { text: 'Allah', match: true },
    ])
    expect(highlightText(source, 'Allah').map(part => part.text).join('')).toBe(source)
  })

  it('matches Arabic base letters while preserving diacritics in the returned text', () => {
    const source = 'ٱلْحَمْدُ لِلَّهِ'
    const ranges = findHighlightRanges(source, 'الحمد')
    expect(ranges.length).toBe(1)
    const match = source.slice(ranges[0][0], ranges[0][1])
    expect(match).toBe('ٱلْحَمْدُ')
  })

  it('does not treat regex punctuation as a pattern', () => {
    const source = 'A+B (C) [D]?'
    expect(highlightText(source, 'A+B (C)')).toEqual([
      { text: 'A+B (C)', match: true },
      { text: ' [D]?', match: false },
    ])
  })

  it('returns an unchanged part for empty searches', () => {
    expect(highlightText('Arabic', '')).toEqual([{ text: 'Arabic', match: false }])
  })
})
