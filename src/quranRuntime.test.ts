import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { validateQuranStructure } from './quranData'
import { loadQuran } from './quranRuntime'

const rawPath = 'public/content/quran-uthmani-v1.1.txt'
const jsonPath = 'public/content/quran-uthmani-v1.1.json'

describe('integrated Quran dataset', () => {
  it('contains the real source-derived 114-surah / 6236-ayah structure', () => {
    const raw = JSON.parse(readFileSync(jsonPath, 'utf8')) as { ayahs: Array<{ id: string; surah: number; ayah: number; arabic: string }> }
    expect(raw.ayahs.length).toBe(6236)
    expect(new Set(raw.ayahs.map(item => item.surah)).size).toBe(114)
    expect(validateQuranStructure(raw.ayahs).valid).toBe(true)
  })

  it('has no duplicate IDs and every ID is canonical', () => {
    const raw = JSON.parse(readFileSync(jsonPath, 'utf8')) as { ayahs: Array<{ id: string; surah: number; ayah: number }> }
    const ids = raw.ayahs.map(item => item.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(raw.ayahs.every(item => item.id === `quran:${item.surah}:${item.ayah}`)).toBe(true)
  })

  it('records source, license, version, verification and the exact source hash', () => {
    const dataset = JSON.parse(readFileSync(jsonPath, 'utf8')) as { source: Record<string, string> }
    const raw = readFileSync(rawPath)
    const hash = createHash('sha256').update(raw).digest('hex')
    expect(dataset.source.sourceId).toBe('tanzil-uthmani')
    expect(dataset.source.sourceName).toBe('Tanzil Project')
    expect(dataset.source.sourceVersion).toBe('1.1')
    expect(dataset.source.license).toContain('Creative Commons Attribution 3.0')
    expect(dataset.source.verificationStatus).toBe('verified')
    expect(dataset.source.reviewStatus).toBe('not_reviewed')
    expect(dataset.source.contentHash).toBe(hash)
  })

  it('loads only the source-gated verified dataset', async () => {
    const dataset = JSON.parse(readFileSync(jsonPath, 'utf8'))
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify(dataset), { status: 200, headers: { 'content-type': 'application/json' } }))
    const loaded = await loadQuran()
    expect(loaded.source.sourceId).toBe('tanzil-uthmani')
    expect(loaded.ayahs.length).toBe(6236)
    vi.unstubAllGlobals()
  })
})
