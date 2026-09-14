import type { ReactNode } from 'react'
import { normalizeSearchText } from './searchModel'

type HighlightPart = { text: string; match: boolean }

function buildSearchMap(value: string): { searchable: string; starts: number[]; ends: number[] } {
  const starts: number[] = []
  const ends: number[] = []
  const searchable = normalizeSearchText(value)
  let originalIndex = 0
  let normalizedIndex = 0
  for (const char of value) {
    const width = char.length
    const normalizedChar = normalizeSearchText(char)
    for (let index = 0; index < normalizedChar.length; index += 1) {
      starts[normalizedIndex] = originalIndex
      ends[normalizedIndex] = originalIndex + width
      normalizedIndex += 1
    }
    originalIndex += width
  }
  return { searchable, starts, ends }
}

function extendAcrossMarks(text: string, end: number): number {
  let cursor = end
  while (cursor < text.length) {
    const char = text[cursor]
    if (normalizeSearchText(char) !== '') break
    cursor += char.length
  }
  return cursor
}

export function findHighlightRanges(text: string, query: string): Array<[number, number]> {
  const needle = normalizeSearchText(query.trim())
  if (!text || !needle) return []
  const mapped = buildSearchMap(text)
  const ranges: Array<[number, number]> = []
  let from = 0
  while (from <= mapped.searchable.length - needle.length) {
    const index = mapped.searchable.indexOf(needle, from)
    if (index < 0) break
    ranges.push([mapped.starts[index], extendAcrossMarks(text, mapped.ends[index + needle.length - 1])])
    from = index + needle.length
  }
  return ranges
}

export function highlightText(text: string, query: string): HighlightPart[] {
  const ranges = findHighlightRanges(text, query)
  if (ranges.length === 0) return [{ text, match: false }]
  const parts: HighlightPart[] = []
  let cursor = 0
  for (const [start, end] of ranges) {
    if (start > cursor) parts.push({ text: text.slice(cursor, start), match: false })
    parts.push({ text: text.slice(start, end), match: true })
    cursor = end
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), match: false })
  return parts
}

export function HighlightedText({ text, query, dir, className }: { text: string; query: string; dir?: 'rtl' | 'ltr'; className?: string }): ReactNode {
  return <span dir={dir} className={className}>{highlightText(text, query).map((part, index) => part.match ? <mark key={`${index}-${part.text}`}>{part.text}</mark> : <span key={`${index}-${part.text}`}>{part.text}</span>)}</span>
}
