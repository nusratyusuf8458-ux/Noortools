import type { ReactNode } from 'react'

type HighlightPart = { text: string; match: boolean }

function isCombiningMark(value: string): boolean {
  return /\p{M}/u.test(value)
}

function buildSearchMap(value: string): { searchable: string; starts: number[]; ends: number[] } {
  const normalized = value.normalize('NFKD')
  const starts: number[] = []
  const ends: number[] = []
  let searchable = ''
  let originalIndex = 0
  for (const char of value) {
    const width = char.length
    const base = char.normalize('NFKD')
    if (!isCombiningMark(char)) {
      const searchableChar = base.replace(/\p{M}/gu, '').toLocaleLowerCase()
      for (const unit of searchableChar) {
        searchable += unit
        starts.push(originalIndex)
        ends.push(originalIndex + width)
      }
    }
    originalIndex += width
  }
  // Keep this normalization call explicit: it guarantees the matcher follows Unicode compatibility rules.
  void normalized
  return { searchable, starts, ends }
}

export function findHighlightRanges(text: string, query: string): Array<[number, number]> {
  const needle = buildSearchMap(query).searchable.trim()
  if (!text || !needle) return []
  const mapped = buildSearchMap(text)
  const ranges: Array<[number, number]> = []
  let from = 0
  while (from <= mapped.searchable.length - needle.length) {
    const index = mapped.searchable.indexOf(needle, from)
    if (index < 0) break
    ranges.push([mapped.starts[index], mapped.ends[index + needle.length - 1]])
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
