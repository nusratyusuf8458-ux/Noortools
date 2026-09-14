import { describe, expect, it } from 'vitest'
import { applyReviewDecision, reviewIsRecorded, withSourceStatus } from './contentVerification'
import type { ReligiousContentItem } from './content'

const base: ReligiousContentItem = {
  id: 'test:1',
  type: 'dua',
  title: 'TEST',
  source: {
    source: 'Test source',
    version: 'test-1',
    license: 'test',
    sourceUrl: 'https://example.com',
    verificationStatus: 'needs_review',
    reviewerStatus: 'not_reviewed',
  },
}

describe('content verification workflow', () => {
  it('keeps imported content non-verified until an explicit review decision is applied', () => {
    const pending = withSourceStatus(base, 'needs_review')
    expect(pending.source.verificationStatus).toBe('needs_review')
    expect(reviewIsRecorded(pending.source)).toBe(false)
  })

  it('requires a named reviewer and records date/status/notes', () => {
    expect(() => applyReviewDecision(base, { reviewerName: '', reviewerRole: 'qualified_scholar', reviewDate: '2026-09-14' })).toThrow()
    const reviewed = applyReviewDecision(base, { reviewerName: 'Named Reviewer', reviewerRole: 'qualified_scholar', reviewDate: '2026-09-14', notes: 'TEST REVIEW ONLY' })
    expect(reviewed.source.verificationStatus).toBe('verified')
    expect(reviewed.source.reviewerStatus).toBe('reviewed')
    expect(reviewed.source.reviewDate).toBe('2026-09-14')
    expect(reviewIsRecorded(reviewed.source)).toBe(true)
  })
})
