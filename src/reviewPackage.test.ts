import { describe, expect, it } from 'vitest'
import { buildReviewPackage } from './reviewPackage'
import type { ReligiousContentItem } from './content'

describe('scholar review package', () => {
  it('exports content and provenance without claiming scholar review', () => {
    const item: ReligiousContentItem = {
      id: 'fixture:1',
      type: 'quran_ayah',
      arabic: 'source text omitted from test assertion',
      source: {
        sourceId: 'fixture-source',
        source: 'Fixture source',
        version: '1',
        license: 'fixture license',
        sourceUrl: 'https://example.invalid',
        reference: 'fixture reference',
        verificationStatus: 'verified',
        reviewStatus: 'not_reviewed',
        contentHash: 'hash',
      },
    }
    const exported = buildReviewPackage([item])
    expect(exported.schema).toBe('noortools.scholar-review-package')
    expect(exported.version).toBe(1)
    expect(exported.items[0]).toMatchObject({ id: 'fixture:1', sourceId: 'fixture-source', sourceVersion: '1', license: 'fixture license', reference: 'fixture reference', verificationStatus: 'verified', reviewStatus: 'not_reviewed', reviewer: null, contentHash: 'hash' })
  })
})
