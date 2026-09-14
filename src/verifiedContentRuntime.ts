export type ContentReviewState = 'source_verified' | 'pending_scholar_review' | 'scholar_reviewed' | 'needs_correction' | 'unavailable'

type RuntimeSource = {
  sourceId: string
  sourceName: string
  sourceVersion: string
  license: string
  reference: string
  sourceUrl: string
  verificationStatus: 'verified' | 'needs_review' | 'unavailable'
  reviewStatus: 'not_reviewed' | 'in_review' | 'reviewed'
  reviewState: ContentReviewState
  reviewer: string | null
  reviewDate: string | null
  reviewNotes: string | null
  importVersion: string
  importDate: string
  contentHash: string
}
export type AllahName = { id: string; type: 'allah_name'; title: string; arabic: string; transliteration: string; meaning: string; references: string[]; source: RuntimeSource }
export type Dua = { id: string; type: 'dua'; title: string; arabic: string; translation: string; transliteration: string; category: string; count: number | null; notes: string | null; reference: string; source: RuntimeSource }
export type Azkar = { id: string; type: 'azkar'; title: string; arabic: string; translation: string; transliteration: string; category: string; count: number; reference: string; source: RuntimeSource }
export type VerifiedContentRuntime = { names: AllahName[]; duas: Dua[]; azkar: Azkar[] }
let cached: VerifiedContentRuntime | null = null

function isObject(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value) }
function sourceOk(value: unknown): value is RuntimeSource {
  if (!isObject(value)) return false
  return typeof value.sourceId === 'string' && typeof value.sourceName === 'string' && typeof value.sourceVersion === 'string' && typeof value.license === 'string' && typeof value.sourceUrl === 'string' && value.verificationStatus === 'verified' && value.reviewState !== 'unavailable' && typeof value.contentHash === 'string'
}
function validate(root: unknown): VerifiedContentRuntime {
  if (!isObject(root) || root.schema !== 'noortools.verified-content' || root.version !== 2 || !isObject(root.datasets)) throw new Error('Verified content dataset has invalid structure.')
  const datasets = root.datasets as Record<string, unknown>
  const namesSet = datasets.names; const duasSet = datasets.duas; const azkarSet = datasets.azkar
  if (!isObject(namesSet) || !isObject(duasSet) || !isObject(azkarSet)) throw new Error('Verified content dataset is incomplete.')
  if (!Array.isArray(namesSet.items) || namesSet.items.length !== 99) throw new Error('99 Names dataset must contain exactly 99 items.')
  if (!isObject(namesSet.source) || !sourceOk(namesSet.source)) throw new Error('99 Names source metadata is invalid.')
  const names: AllahName[] = namesSet.items as AllahName[]
  const nameIds = new Set<string>()
  names.forEach((item, index) => {
    if (!item || item.id !== `allah-name:${index + 1}` || item.type !== 'allah_name' || !item.arabic || !item.transliteration || !item.meaning || !sourceOk(item.source)) throw new Error(`99 Names item ${index + 1} failed validation.`)
    if (nameIds.has(item.id)) throw new Error(`Duplicate Allah name ${item.id}.`)
    nameIds.add(item.id)
  })
  if (!Array.isArray(duasSet.items) || !isObject(duasSet.source) || !sourceOk(duasSet.source)) throw new Error('Dua dataset metadata is invalid.')
  const duas = duasSet.items as Dua[]
  if (duas.length === 0) throw new Error('Dua dataset is empty.')
  const duaIds = new Set<string>()
  duas.forEach(item => {
    if (!item || typeof item.id !== 'string' || item.type !== 'dua' || !item.arabic || !item.translation || !item.reference || !sourceOk(item.source)) throw new Error(`Dua ${item?.id ?? 'unknown'} failed validation.`)
    if (duaIds.has(item.id)) throw new Error(`Duplicate Dua ${item.id}.`)
    duaIds.add(item.id)
    if (item.count !== null && (!Number.isInteger(item.count) || item.count < 1)) throw new Error(`Dua ${item.id} has an invalid sourced count.`)
  })
  if (!Array.isArray(azkarSet.items) || !isObject(azkarSet.source) || !sourceOk(azkarSet.source)) throw new Error('Azkar dataset metadata is invalid.')
  const azkar = azkarSet.items as Azkar[]
  if (azkar.length === 0) throw new Error('Azkar dataset is empty.')
  const azkarIds = new Set<string>()
  azkar.forEach(item => {
    if (!item || typeof item.id !== 'string' || item.type !== 'azkar' || !item.arabic || !item.translation || !item.reference || !Number.isInteger(item.count) || item.count < 1 || !sourceOk(item.source)) throw new Error(`Azkar ${item?.id ?? 'unknown'} failed validation.`)
    if (azkarIds.has(item.id)) throw new Error(`Duplicate Azkar ${item.id}.`)
    azkarIds.add(item.id)
  })
  return { names, duas, azkar }
}

export async function loadVerifiedContent(): Promise<VerifiedContentRuntime> {
  if (cached) return cached
  const response = await fetch('/content/phase-2.2-content.json', { cache: 'no-store' })
  if (!response.ok) throw new Error(`Verified content unavailable: HTTP ${response.status}`)
  cached = validate(await response.json())
  return cached
}
export function clearVerifiedContentCache(): void { cached = null }
