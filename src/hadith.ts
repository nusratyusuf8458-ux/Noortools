import { getPhase23Source, type ReviewState } from './phase23Sources'

export type HadithRecord = {
  id: string
  collection: string
  book: string | null
  chapter: string | null
  hadithNumber: string
  arabic: string | null
  translation: string | null
  translationLanguage: string | null
  translator: string | null
  grading: string | null
  reference: string
  sourceId: string
  sourceVersion: string
  license: string
  contentHash: string
  verificationStatus: 'verified' | 'unavailable'
  reviewState: ReviewState
}

export function validateHadithRecord(record: HadithRecord): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  if (!record.id || !record.collection || !record.hadithNumber || !record.reference) errors.push('Hadith stable identity/reference is incomplete.')
  if (record.id !== `hadith:${record.sourceId}:${record.collection}:${record.hadithNumber}`) errors.push(`Unstable Hadith id ${record.id}.`)
  if (!record.sourceId || !record.sourceVersion || !record.license || !/^[a-f0-9]{64}$/.test(record.contentHash)) errors.push(`Hadith ${record.id} has incomplete source/hash metadata.`)
  if (record.translation && (!record.translationLanguage || !record.translator)) errors.push(`Hadith ${record.id} translation metadata is incomplete.`)
  if (record.verificationStatus === 'verified' && !record.arabic && !record.translation) errors.push(`Hadith ${record.id} is verified but has no text.`)
  if (record.grading && record.grading.trim().toLowerCase() === 'sahih' && !record.reference) errors.push(`Hadith ${record.id} has an unsupported grading claim.`)
  return { valid: errors.length === 0, errors }
}

export const HADITH_UNAVAILABLE_SOURCE = getPhase23Source('hadith.sunnahcom')!
export const HADITH_UI_STATE = {
  available: false,
  reviewState: 'unavailable' as const,
  reason: 'No collection-specific Hadith edition has cleared the redistribution audit yet.',
}
