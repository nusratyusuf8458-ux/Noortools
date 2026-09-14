import type { ReligiousContentItem, SourceMetadata, VerificationStatus } from './content'

export type ReviewDecision = {
  reviewer: string
  reviewerRole: 'qualified_scholar' | 'content_reviewer'
  reviewDate: string
  notes?: string
}

export function withSourceStatus(item: ReligiousContentItem, status: VerificationStatus): ReligiousContentItem {
  return { ...item, source: { ...item.source, verificationStatus: status } }
}

export function applyReviewDecision(item: ReligiousContentItem, decision: ReviewDecision): ReligiousContentItem {
  const reviewer = decision.reviewer.trim()
  if (!reviewer) throw new Error('A named reviewer is required.')
  if (decision.reviewerRole !== 'qualified_scholar' && decision.reviewerRole !== 'content_reviewer') throw new Error('A valid reviewer role is required.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(decision.reviewDate)) throw new Error('Review date must use YYYY-MM-DD.')
  return {
    ...item,
    source: {
      ...item.source,
      verificationStatus: 'verified',
      reviewStatus: 'reviewed',
      reviewer,
      reviewerNotes: `${decision.reviewerRole}: ${reviewer}${decision.notes ? ` — ${decision.notes}` : ''}`,
      reviewDate: decision.reviewDate,
    },
  }
}

export function reviewIsRecorded(source: SourceMetadata): boolean {
  return source.reviewStatus === 'reviewed' && Boolean(source.reviewer && source.reviewDate)
}
