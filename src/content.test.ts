import { describe, expect, it } from 'vitest'
import { QURAN_SOURCE, QURAN_SURAH_SLOTS, isPresentable, searchVerifiedContent, validateQuranItems, type QuranAyah, type ReligiousContentItem } from './content'
import { validateImportedQuran } from './quranValidation'

const source = { ...QURAN_SOURCE, verificationStatus: 'verified' as const, reviewerStatus: 'not_reviewed' as const }
const item = (surah: number, ayah: number): QuranAyah => ({ id: `quran:${surah}:${ayah}`, type: 'quran_ayah', surah, ayah, arabic: `TEST-${surah}-${ayah}`, source })

function syntheticStructure() {
  const result: QuranAyah[] = []
  let remaining = 6236
  for (let surah = 1; surah <= 114; surah += 1) {
    const count = surah === 114 ? remaining : Math.max(1, Math.floor(remaining / (115 - surah)))
    for (let ayah = 1; ayah <= count; ayah += 1) result.push(item(surah, ayah))
    remaining -= count
  }
  return result
}

describe('Phase-2 content foundation', () => {
  it('defines exactly 114 Quran structural slots without religious source text', () => {
    expect(QURAN_SURAH_SLOTS).toHaveLength(114)
    expect(QURAN_SURAH_SLOTS.every(slot => slot.available === false)).toBe(true)
  })

  it('validates a complete 114-surah structural dataset without trusting text content', () => {
    const dataset = syntheticStructure()
    expect(dataset).toHaveLength(6236)
    expect(validateImportedQuran(dataset)).toEqual({ valid: true, errors: [] })
  })

  it('detects missing surah and broken ayah numbering', () => {
    const dataset = syntheticStructure().filter(row => !(row.surah === 10 && row.ayah === 1))
    expect(validateImportedQuran(dataset).valid).toBe(false)
    const broken = [item(1, 1), item(1, 3)]
    expect(validateImportedQuran(broken).errors.some(error => error.includes('Missing surah'))).toBe(true)
  })

  it('requires source metadata and verified status for Quran items', () => {
    const needsReview = { ...item(1, 1), source: { ...source, verificationStatus: 'needs_review' as const } }
    expect(validateQuranItems([needsReview]).valid).toBe(false)
    expect(QURAN_SOURCE.source).toBe('Tanzil Project')
    expect(QURAN_SOURCE.version).toBe('1.1')
    expect(QURAN_SOURCE.license.length).toBeGreaterThan(10)
    expect(QURAN_SOURCE.sourceUrl).toContain('tanzil.net')
  })

  it('never makes unavailable or unverified content searchable/presentable', () => {
    const unavailable: ReligiousContentItem = { id: 'dua:test', type: 'dua', title: 'TEST', source: { ...source, verificationStatus: 'unavailable' } }
    const verified: ReligiousContentItem = { id: 'name:test', type: 'allah_name', title: 'TEST', source }
    expect(isPresentable(unavailable)).toBe(false)
    expect(searchVerifiedContent([unavailable, verified], 'test')).toEqual([verified])
  })
})
