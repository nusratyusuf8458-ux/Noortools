import { describe, expect, it } from 'vitest'
import { HADITH_UI_STATE, validateHadithRecord, type HadithRecord } from './hadith'

const record = (overrides: Partial<HadithRecord> = {}): HadithRecord => ({
  id: 'hadith:synthetic-source:synthetic-collection:1',
  collection: 'synthetic-collection',
  book: null,
  chapter: null,
  hadithNumber: '1',
  arabic: null,
  translation: null,
  translationLanguage: null,
  translator: null,
  grading: null,
  reference: 'synthetic reference',
  sourceId: 'synthetic-source',
  sourceVersion: 'synthetic-version',
  license: 'synthetic license',
  contentHash: 'a'.repeat(64),
  verificationStatus: 'unavailable',
  reviewState: 'unavailable',
  ...overrides,
})

describe('Hadith model', () => {
  it('preserves stable collection/number references and hash metadata', () => {
    expect(validateHadithRecord(record())).toEqual({ valid: true, errors: [] })
    expect(validateHadithRecord(record({ id: 'wrong-id' })).valid).toBe(false)
  })

  it('requires translation metadata when translation exists', () => {
    expect(validateHadithRecord(record({ translation: 'synthetic translation' })).valid).toBe(false)
    expect(validateHadithRecord(record({ translation: 'synthetic translation', translationLanguage: 'en', translator: 'Synthetic translator' })).valid).toBe(true)
  })

  it('does not permit a generic Sahih claim without sourced reference metadata', () => {
    expect(validateHadithRecord(record({ grading: 'Sahih', reference: '' })).valid).toBe(false)
  })

  it('keeps Hadith unavailable until redistribution is cleared', () => {
    expect(HADITH_UI_STATE.available).toBe(false)
    expect(HADITH_UI_STATE.reviewState).toBe('unavailable')
  })
})
