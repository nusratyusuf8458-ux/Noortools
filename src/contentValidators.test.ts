import { describe, expect, it } from 'vitest'
import { validateAzkarItem, validateDuaItem, validateHadithItem, validateNamesDataset } from './contentValidators'
import type { ReligiousContentItem } from './content'

const unavailableSource = { sourceId: 'pending-source', source: 'Not connected', version: '0', license: 'not applicable', sourceUrl: 'https://example.invalid', verificationStatus: 'unavailable' as const }

describe('content validators', () => {
  it('does not fabricate a 99 Names dataset', () => {
    expect(validateNamesDataset([])).toEqual({ valid: false, status: 'unavailable' })
  })

  it('requires 99 source-defined records before a Names dataset can be verified', () => {
    const items = Array.from({ length: 98 }, (_, index) => ({ id: `name:${index + 1}`, type: 'allah_name', source: { ...unavailableSource, verificationStatus: 'needs_review' as const } })) as ReligiousContentItem[]
    expect(validateNamesDataset(items).status).toBe('needs_review')
  })

  it('requires an explicit Dua reference and source metadata', () => {
    const dua = { id: 'dua:1', type: 'dua', source: { ...unavailableSource, reference: 'source-reference' }, count: 1 } as ReligiousContentItem & { count: number }
    expect(validateDuaItem(dua).valid).toBe(true)
    expect(validateDuaItem({ ...dua, source: { ...dua.source, reference: '' } }).reason).toBe('Missing reference.')
  })

  it('never accepts an Azkar count of zero or a fractional value', () => {
    const azkar = { id: 'azkar:1', type: 'azkar', source: { ...unavailableSource, reference: 'source-reference' }, count: 1 } as ReligiousContentItem & { count: number }
    expect(validateAzkarItem(azkar).valid).toBe(true)
    expect(validateAzkarItem({ ...azkar, count: 0 }).valid).toBe(false)
    expect(validateAzkarItem({ ...azkar, count: 1.5 }).valid).toBe(false)
  })

  it('requires a hadith collection and reference without asserting authenticity', () => {
    const hadith = { id: 'hadith:1', type: 'hadith', source: { ...unavailableSource }, reference: 'Collection 1:1', collection: 'Collection' } as ReligiousContentItem & { reference: string; collection: string }
    expect(validateHadithItem(hadith).valid).toBe(true)
    expect(validateHadithItem({ ...hadith, reference: '' }).valid).toBe(false)
    expect(validateHadithItem({ ...hadith, collection: '' }).valid).toBe(false)
  })
})
