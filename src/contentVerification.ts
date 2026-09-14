import type { ReligiousContentItem, SourceMetadata, VerificationStatus } from './content'
import type { ReviewState } from './content'

export type ReviewDecision = {
  reviewer: string
  reviewerRole: 'qualified_scholar' | 'content_reviewer'
  reviewDate: string
  notes?: string
}

export function withSourceStatus(item: ReligiousContentItem, status: VerificationStatus): ReligiousContentItem {
  return { ...item, source: { ...item.source, verificationStatus: status, reviewState: status === 'unavailable' ? 'unavailable' : 'pending_scholar_review' } }
}

export function applyReviewDecision(item: ReligiousContentItem, decision: ReviewDecision): ReligiousContentItem {
  const reviewer = decision.reviewer.trim()
  if (!reviewer) throw new Error('A named reviewer is required.')
  if (decision.reviewerRole !== 'qualified_scholar') throw new Error('Only a qualified scholar can mark content scholar-reviewed.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(decision.reviewDate)) throw new Error('Review date must use YYYY-MM-DD.')
  return {
    ...item,
    source: {
      ...item.source,
      verificationStatus: 'verified', reviewStatus: 'reviewed', reviewState: 'scholar_reviewed',
      reviewer, reviewerNotes: decision.notes ? `qualified_scholar: ${decision.notes}` : 'qualified_scholar review recorded', reviewDate: decision.reviewDate,
    },
  }
}

export function reviewIsRecorded(source: SourceMetadata): boolean { return source.reviewState === 'scholar_reviewed' && Boolean(source.reviewer && source.reviewDate) }
export function reviewStateLabel(state: ReviewState | undefined): string { return state === 'scholar_reviewed' ? 'Scholar reviewed' : state === 'needs_correction' ? 'Needs correction' : state === 'unavailable' ? 'Unavailable' : state === 'pending_scholar_review' ? 'Pending scholar review' : 'Verified source' }
