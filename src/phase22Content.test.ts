import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const path = 'public/content/phase-2.2-content.json'
const data = JSON.parse(readFileSync(path, 'utf8')) as { schema: string; version: number; datasets: { names: { source: Record<string, unknown>; items: Array<Record<string, unknown>> }; duas: { source: Record<string, unknown>; items: Array<Record<string, unknown>> }; azkar: { source: Record<string, unknown>; items: Array<Record<string, unknown>> } } }

function assertSource(source: Record<string, unknown>, expectedLicense: string) {
  expect(source.sourceId).toEqual(expect.any(String))
  expect(source.sourceName).toEqual(expect.any(String))
  expect(source.sourceVersion).toEqual(expect.any(String))
  expect(source.license).toContain(expectedLicense)
  expect(source.sourceUrl).toMatch(/^https?:\/\//)
  expect(source.verificationStatus).toBe('verified')
  expect(source.reviewState).toBe('source_verified')
  expect(source.reviewStatus).toBe('not_reviewed')
  expect(source.reviewer).toBeNull()
  expect(source.reviewDate).toBeNull()
  expect(source.contentHash).toMatch(/^[a-f0-9]{64}$/)
  expect(source.importVersion).toEqual(expect.any(String))
  expect(source.importDate).toEqual(expect.any(String))
}

describe('real Phase 2.2 datasets', () => {
  it('has the expected schema and complete 99 Names dataset', () => {
    expect(data.schema).toBe('noortools.verified-content')
    expect(data.version).toBe(2)
    expect(data.datasets.names.items).toHaveLength(99)
    const ids = new Set<string>()
    data.datasets.names.items.forEach((item, index) => {
      expect(item.id).toBe(`allah-name:${index + 1}`)
      expect(item.type).toBe('allah_name')
      expect(item.arabic).toEqual(expect.any(String))
      expect(item.transliteration).toEqual(expect.any(String))
      expect(item.meaning).toEqual(expect.any(String))
      expect(ids.has(String(item.id))).toBe(false)
      ids.add(String(item.id))
      assertSource(item.source as Record<string, unknown>, 'Apache-2.0')
    })
    assertSource(data.datasets.names.source, 'Apache-2.0')
  })

  it('validates Dua references, counts and stable IDs without inventing counts', () => {
    expect(data.datasets.duas.items.length).toBeGreaterThan(0)
    const ids = new Set<string>()
    data.datasets.duas.items.forEach(item => {
      expect(String(item.id)).toMatch(/^dua:fitrahive:(selected|daily):\d+$/)
      expect(item.type).toBe('dua')
      expect(item.arabic).toEqual(expect.any(String))
      expect(item.translation).toEqual(expect.any(String))
      expect(item.reference).toEqual(expect.any(String))
      expect(ids.has(String(item.id))).toBe(false)
      ids.add(String(item.id))
      if (item.count !== null) expect(Number.isInteger(item.count)).toBe(true)
    })
    assertSource(data.datasets.duas.source, 'MIT')
  })

  it('validates sourced Azkar counts, references and stable IDs', () => {
    expect(data.datasets.azkar.items.length).toBeGreaterThan(0)
    const ids = new Set<string>()
    data.datasets.azkar.items.forEach(item => {
      expect(String(item.id)).toMatch(/^azkar:seen-arabic:\d+$/)
      expect(item.type).toBe('azkar')
      expect(item.arabic).toEqual(expect.any(String))
      expect(item.translation).toEqual(expect.any(String))
      expect(item.reference).toEqual(expect.any(String))
      expect(Number.isInteger(item.count)).toBe(true)
      expect(Number(item.count)).toBeGreaterThan(0)
      expect(ids.has(String(item.id))).toBe(false)
      ids.add(String(item.id))
    })
    assertSource(data.datasets.azkar.source, 'MIT')
  })

  it('requires every dataset to carry a source hash and no seeded scholar identity', () => {
    const hashes = new Set<string>()
    for (const dataset of [data.datasets.names, data.datasets.duas, data.datasets.azkar]) {
      const source = dataset.source
      expect(source.reviewer).toBeNull()
      expect(source.reviewStatus).toBe('not_reviewed')
      expect(source.reviewState).toBe('source_verified')
      expect(String(source.contentHash)).toMatch(/^[a-f0-9]{64}$/)
      hashes.add(String(source.contentHash))
    }
    expect(hashes.size).toBe(3)
  })
})
