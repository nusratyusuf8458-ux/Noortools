export type LearningModule = 'prophets' | 'sahaba' | 'seerah' | 'history' | 'stories' | 'learning' | 'quizzes'
export type VerificationStatus = 'source_verified' | 'pending_scholar_review' | 'scholar_reviewed' | 'needs_correction' | 'unavailable'
export type ReviewStatus = 'not_reviewed' | 'pending_scholar_review' | 'scholar_reviewed' | 'needs_correction'
export type ContentType = 'prophet' | 'sahabi' | 'seerah_event' | 'history_event' | 'story' | 'lesson' | 'quiz'
export type LicenseStatus = 'public_domain' | 'redistribution_permitted_noncommercial' | 'external_reference_only' | 'blocked' | 'unknown'

export type SourceRecord = {
  id: string
  sourceName: string
  publisher: string
  author: string | null
  edition: string | null
  version: string | null
  publicationYear: number | null
  immutableReference: string
  license: string
  licenseStatus: LicenseStatus
  redistributionRights: string
  attribution: string
  commercialUse: string
  contentHash: string | null
  verificationStatus: VerificationStatus
  reviewStatus: ReviewStatus
  notes: string
  externalUrl: string
}

export type LearningItem = {
  id: string
  type: ContentType
  module: LearningModule
  title: string
  subtitle: string
  content: string
  language: string
  sourceId: string
  sourceName: string
  sourceVersion: string
  edition: string
  license: string
  reference: string
  contentHash: string
  verificationStatus: VerificationStatus
  reviewStatus: ReviewStatus
  reviewer: string | null
  reviewDate: string | null
  reviewNotes: string | null
  createdAt: string
  updatedAt: string
}

export type QuizItem = LearningItem & {
  type: 'quiz'
  question: string
  options: string[]
  correctAnswerIndex: number
  explanation: string
}

export const SOURCE_RECORDS: SourceRecord[] = [
  {
    id: 'pickthall-1930-gutenberg',
    sourceName: 'The Meaning of the Glorious Koran',
    publisher: 'Marmaduke Pickthall / Project Gutenberg',
    author: 'Marmaduke William Pickthall',
    edition: '1930',
    version: 'Gutenberg verified edition used by NoorTools Phase 2.3',
    publicationYear: 1930,
    immutableReference: 'sha256:3b96fa3ad318ab9d91db53b25100d5169fafe3a1ecb993e7c36ffff55bf9d8bc',
    license: 'Public domain in the USA; existing NoorTools Phase 2.3 distribution record',
    licenseStatus: 'public_domain',
    redistributionRights: 'Existing Phase 2.3 dataset is already cleared under its recorded provenance and audit.',
    attribution: 'Marmaduke William Pickthall / Project Gutenberg',
    commercialUse: 'Use only within the existing Phase 2.3 clearance scope.',
    contentHash: '3b96fa3ad318ab9d91db53b25100d5169fafe3a1ecb993e7c36ffff55bf9d8bc',
    verificationStatus: 'source_verified',
    reviewStatus: 'scholar_reviewed',
    notes: 'Referenced for Quran-linked learning architecture; Phase 3E does not copy or create historical narratives from it.',
    externalUrl: 'https://www.gutenberg.org/ebooks/16955',
  },
  {
    id: 'muir-life-mahomet-1894',
    sourceName: 'The Life of Mahomet: From Original Sources',
    publisher: 'Smith, Elder',
    author: 'Sir William Muir',
    edition: '3rd edition',
    version: '1894 edition',
    publicationYear: 1894,
    immutableReference: 'Wikisource author/work record; source edition 1894',
    license: 'Public domain worldwide per Wikisource author record',
    licenseStatus: 'public_domain',
    redistributionRights: 'Public-domain work; later editions/transcriptions must still be checked for added copyrighted material.',
    attribution: 'Sir William Muir, Smith, Elder',
    commercialUse: 'Public-domain work; NoorTools treats it as a historical source, not as automatically authoritative Islamic scholarship.',
    contentHash: null,
    verificationStatus: 'source_verified',
    reviewStatus: 'pending_scholar_review',
    notes: 'Historical source with clear provenance and public-domain status. No claim of doctrinal or scholarly verification is made.',
    externalUrl: 'https://en.wikisource.org/wiki/Author:William_Muir',
  },
  {
    id: 'islamqa-site',
    sourceName: 'Islam Question & Answer',
    publisher: 'International Islamic Academy Society',
    author: null,
    edition: null,
    version: 'Current Terms of Use',
    publicationYear: null,
    immutableReference: 'https://islamqa.info/en/terms',
    license: 'Copyrighted site content; personal/non-commercial use only',
    licenseStatus: 'blocked',
    redistributionRights: 'Commercial redistribution and repurposing are prohibited without prior consent.',
    attribution: 'International Islamic Academy Society',
    commercialUse: 'Not permitted under the site terms without prior consent.',
    contentHash: null,
    verificationStatus: 'unavailable',
    reviewStatus: 'not_reviewed',
    notes: 'External reference only. No content is imported or bundled.',
    externalUrl: 'https://islamqa.info/en/terms',
  },
]

export const MODULE_LABELS: Record<LearningModule, string> = {
  prophets: 'Prophets', sahaba: 'Sahaba', seerah: 'Seerah', history: 'Islamic History', stories: 'Stories Mode', learning: 'Islamic Learning', quizzes: 'Quizzes',
}

export const SEEDED_ITEMS: LearningItem[] = []
export const SEEDED_QUIZZES: QuizItem[] = []

export function moduleItems(module: LearningModule): LearningItem[] { return SEEDED_ITEMS.filter(item => item.module === module && item.verificationStatus !== 'unavailable') }
export function searchableItems(): LearningItem[] { return SEEDED_ITEMS.filter(item => item.verificationStatus !== 'unavailable') }
export function validateQuiz(item: QuizItem): boolean {
  return item.type === 'quiz' && item.question.trim().length > 0 && item.options.length >= 2 && item.options.every(option => option.trim().length > 0) && Number.isInteger(item.correctAnswerIndex) && item.correctAnswerIndex >= 0 && item.correctAnswerIndex < item.options.length && item.explanation.trim().length > 0 && item.content.trim().length > 0 && item.sourceId.trim().length > 0 && item.reference.trim().length > 0 && item.verificationStatus !== 'unavailable'
}
export function sourceStatusLabel(source: SourceRecord): string {
  if (source.licenseStatus === 'blocked') return 'Blocked — external reference only'
  if (source.reviewStatus === 'scholar_reviewed') return 'Source verified · scholar reviewed'
  if (source.reviewStatus === 'pending_scholar_review') return 'Source verified · scholar review pending'
  return source.verificationStatus === 'source_verified' ? 'Source verified' : 'Unavailable'
}
export function canShare(item: LearningItem): boolean { return Boolean(item.reference && item.sourceName && item.license !== 'unknown' && item.verificationStatus !== 'unavailable') }
export function audioStatus(item: LearningItem | null): 'available' | 'unavailable' { return item && item.content.trim() && item.verificationStatus !== 'unavailable' ? 'unavailable' : 'unavailable' }
export function normalizeLearningSearch(value: string): string { return value.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase() }
export function searchLearning(query: string): LearningItem[] { const q = normalizeLearningSearch(query.trim()); if (!q) return []; return searchableItems().filter(item => normalizeLearningSearch(`${item.title} ${item.subtitle} ${item.content} ${item.reference}`).includes(q)).slice(0, 50) }
