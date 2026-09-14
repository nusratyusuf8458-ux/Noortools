import type { ReligiousContentItem } from './content'

export function validateReference(item: Pick<ReligiousContentItem, 'source'>): boolean {
  return Boolean(item.source.source.trim() && item.source.version.trim() && item.source.license.trim() && item.source.sourceUrl.trim() && item.source.verificationStatus)
}

export function validateDuaItem(item: ReligiousContentItem & { category?: string; count?: number; reference?: string }): { valid: boolean; reason?: string } {
  if (item.type !== 'dua') return { valid: false, reason: 'Wrong content type.' }
  if (!item.source.reference && !item.reference) return { valid: false, reason: 'Missing reference.' }
  if (item.count !== undefined && (!Number.isInteger(item.count) || item.count <= 0)) return { valid: false, reason: 'Invalid count.' }
  return { valid: validateReference(item) || item.source.verificationStatus === 'unavailable', reason: validateReference(item) ? undefined : 'Missing source metadata.' }
}

export function validateAzkarItem(item: ReligiousContentItem & { count?: number; timing?: string }): { valid: boolean; reason?: string } {
  if (item.type !== 'azkar') return { valid: false, reason: 'Wrong content type.' }
  if (item.count === undefined || !Number.isInteger(item.count) || item.count <= 0) return { valid: false, reason: 'Count must come from source metadata.' }
  if (!item.source.reference && !item.source.collection) return { valid: false, reason: 'Missing reference or collection.' }
  return { valid: validateReference(item) || item.source.verificationStatus === 'unavailable', reason: validateReference(item) ? undefined : 'Missing source metadata.' }
}

export function validateHadithItem(item: ReligiousContentItem & { reference?: string; collection?: string }): { valid: boolean; reason?: string } {
  if (item.type !== 'hadith') return { valid: false, reason: 'Wrong content type.' }
  if (!item.reference && !item.source.reference) return { valid: false, reason: 'Missing hadith reference.' }
  if (!item.collection && !item.source.collection) return { valid: false, reason: 'Missing hadith collection.' }
  return { valid: validateReference(item) || item.source.verificationStatus === 'unavailable', reason: validateReference(item) ? undefined : 'Missing source metadata.' }
}

export function validateNamesDataset(items: ReligiousContentItem[]): { valid: boolean; status: 'verified' | 'unavailable' | 'needs_review'; reason?: string } {
  if (items.length === 0) return { valid: false, status: 'unavailable' }
  if (items.length !== 99) return { valid: false, status: 'needs_review', reason: `Expected 99 source-defined records; received ${items.length}.` }
  if (items.some(item => item.type !== 'allah_name' || !item.arabic || !validateReference(item))) return { valid: false, status: 'needs_review', reason: 'One or more names lacks required source metadata.' }
  return { valid: true, status: 'verified' }
}
