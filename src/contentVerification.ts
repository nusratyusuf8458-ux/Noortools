import type { ReligiousContentItem, SourceMetadata, VerificationStatus } from './content'

export type ReviewDecision = {
  reviewerName: string
  reviewerRole: 'qualified_scholar' | 'content_reviewer'
  reviewDate: string
  notes?: string
}

export function withSourceStatus(item: ReligiousContentItem, status: VerificationStatus): ReligiousContentItem {
  return { ...item, source: { ...item.source, verificationStatus: status } }
}

export function applyReviewDecision(item: ReligiousContentItem, decision: ReviewDecision): ReligiousContentItem {
  const reviewerName = decision.reviewerName.trim()
  if (!reviewerName) throw new Error('A named reviewer is required.')
  if (decision.reviewerRole !== 'qualified_scholar' && decision.reviewerRole !== 'content_reviewer') throw new Error('A valid reviewer role is required.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(decision.reviewDate)) throw new Error('Review date must use YYYY-MM-DD.')
  return {
    ...item,
    source: {
      ...item.source,
      verificationStatus: 'verified',
      reviewerStatus: 'reviewed',
      reviewerNotes: `${decision.reviewerRole}: ${reviewerName}${decision.notes ? ` — ${decision.notes}` : ''}`,
      reviewDate: decision.reviewDate,
    },
  }
}

export function reviewIsRecorded(source: SourceMetadata): boolean {
  return source.reviewerStatus === 'reviewed' && Boolean(source.reviewDate && source.reviewerNotes)
}
