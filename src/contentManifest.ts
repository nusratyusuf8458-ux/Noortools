export type VerificationStatus = 'verified' | 'needs_review' | 'unavailable'

export type ReviewStatus = 'not_reviewed' | 'in_review' | 'reviewed'

export type ContentSourceManifest = {
  sourceId: string
  sourceName: string
  sourceVersion: string
  edition: string
  license: string
  licenseUrl: string
  sourceUrl: string
  reference: string
  verificationStatus: VerificationStatus
  reviewStatus: ReviewStatus
  contentHash: string
  importVersion: string
  importedAt: string
  reviewer?: string
  reviewDate?: string
  reviewNotes?: string
}

export const tanzilUthmaniPolicy = {
  sourceId: 'tanzil-uthmani',
  sourceName: 'Tanzil Project',
  sourceVersion: '1.1',
  edition: 'Uthmani',
  license: 'Creative Commons Attribution 3.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
  attributionUrl: 'https://tanzil.net',
  modificationPolicy: 'Canonical text must be copied verbatim; changing the text is not allowed.',
} as const
