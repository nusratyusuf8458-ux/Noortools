# NoorTools Phase 2.2 Source & Redistribution Audit

Audit date: 2026-09-14

## 99 Names of Allah

- Source dataset: `UmmahLibrary/ummah-library` `packages/data/datasets/asma.json`
- Pinned source commit: `12c9a9123c235a8dd1f2e8524e1f53716b62f7e2`
- Dataset version: `1.0.0`
- Upstream attribution states that the Names are from the Qur'an and Sunnah and that Arabic, transliteration and English meaning are extracted from `my-prayers/muslim-data-flutter` (`muslim_db` asset).
- Upstream dataset license: Apache-2.0 for the `asma.json` dataset attribution.
- Required attribution is retained in the NoorTools source manifest and generated records.
- Redistribution: permitted under the identified Apache-2.0 dataset terms, subject to retaining the applicable notices/license.
- Scholar review: pending. The source itself explicitly keeps English wording subject to review; NoorTools does not claim scholar verification.
- No source text was authored or paraphrased by NoorTools.

## Duas

- Source repository: `fitrahive/dua-dhikr`
- Pinned source commit: `f42f895f914319a844c3e3c2279483cae060ea19`
- Data used: `data/dua-dhikr/selected-dua/en.json` and `data/dua-dhikr/daily-dua/en.json`
- License: MIT, copyright 2023 Fitrahive.
- Redistribution: MIT permits copying, modification and distribution with the copyright and license notice retained.
- Each imported record preserves the source-provided Arabic, translation, transliteration where present, and `source` reference field.
- NoorTools does not create a count when the source does not supply a structured count; those records remain `count: null`.
- Requested UI categories are navigation taxonomy derived from source titles; they are not asserted as source authenticity classifications.
- Scholar review: pending.

## Morning & Evening Azkar

- Source repository: `Seen-Arabic/Morning-And-Evening-Adhkar-DB`
- Pinned source commit: `29d7623fede52eca835a789025dfda866e8cfe44`
- Data used: `result/en.json`
- License: MIT, copyright 2024 Seen Arabic.
- Redistribution: MIT permits copying, modification and distribution with the copyright and license notice retained.
- The project README/attribution identifies the collection as derived from Hisn Al-Muslim and associated scholarly references.
- Each item preserves the source-provided Arabic, translation, transliteration, reference/source field and explicit repeat count.
- Scholar review: pending.

## Hadith

Not bundled in Phase 2.2.

The investigated public API/dataset options do not provide a sufficiently clear, collection-by-collection redistribution chain for an offline NoorTools bundle. A public API, an open-source wrapper or an openly visible website is not treated as permission to redistribute the underlying hadith text and translations. Therefore the feature remains unavailable rather than guessing.

## Quran translations

Not bundled in Phase 2.2.

Tanzil Uthmani v1.1 licensing for the Arabic Quran text does not automatically license third-party translations. Quran Foundation developer terms also do not grant NoorTools permission to redistribute raw content as a bundled offline translation catalogue. Therefore no translation is bundled until a specific translator/edition license and redistribution permission are established.

## Quran audio

No audio is bundled in Phase 2.2.

Recitation recordings have separate rights from Quran text. The reviewed provider terms do not establish a general NoorTools redistribution licence for downloaded recitation files, so the provider remains unavailable for offline distribution until explicit permission is established.

## Review-state policy

`source_verified` means NoorTools verified provenance, source version, licensing information, required fields and deterministic importability.

`source_verified` does **not** mean `scholar_reviewed`.

Only an explicitly recorded qualified-scholar review may set `reviewState` to `scholar_reviewed`. No reviewer identity is seeded by this repository.

## Hash policy

Every generated Phase 2.2 dataset records a SHA-256 source hash in its source metadata. Individual records also receive a deterministic content hash. The importer is pinned to immutable upstream commits; a source update requires an explicit importer/source-version change rather than silently replacing religious content.
