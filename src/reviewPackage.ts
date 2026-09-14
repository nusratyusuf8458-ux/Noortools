import type { ReligiousContentItem } from './content'

export type ReviewPackageItem = {
  id: string
  type: ReligiousContentItem['type']
  arabic: string | null
  translation: string | null
  transliteration: string | null
  title: string | null
  sourceId: string
  sourceName: string
  sourceVersion: string
  license: string
  reference: string | null
  verificationStatus: ReligiousContentItem['source']['verificationStatus']
  reviewStatus: ReligiousContentItem['source']['reviewStatus'] | 'not_reviewed'
  reviewer: string | null
  reviewDate: string | null
  reviewNotes: string | null
  contentHash: string | null
}

export function buildReviewPackage(items: ReligiousContentItem[]): { schema: 'noortools.scholar-review-package'; version: 1; exportedAt: string; items: ReviewPackageItem[] } {
  return {
    schema: 'noortools.scholar-review-package',
    version: 1,
    exportedAt: new Date().toISOString(),
    items: items.map(item => ({
      id: item.id,
      type: item.type,
      arabic: item.arabic ?? null,
      translation: item.translation ?? null,
      transliteration: item.transliteration ?? null,
      title: item.title ?? null,
      sourceId: item.source.sourceId,
      sourceName: item.source.source,
      sourceVersion: item.source.version,
      license: item.source.license,
      reference: item.source.reference ?? null,
      verificationStatus: item.source.verificationStatus,
      reviewStatus: item.source.reviewStatus ?? 'not_reviewed',
      reviewer: item.source.reviewer ?? null,
      reviewDate: item.source.reviewDate ?? null,
      reviewNotes: item.source.reviewerNotes ?? null,
      contentHash: item.contentHash ?? item.source.contentHash ?? null,
    })),
  }
}
