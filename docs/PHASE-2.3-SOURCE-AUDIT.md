# Phase 2.3 — Source + License + Redistribution Audit

Audit date: 2026-09-14

This audit is deliberately conservative. A public website, open endpoint, or repository license is not treated as permission to redistribute third-party religious text or recordings unless the specific data/edition is covered.

## A. Hadith

| Candidate | Collection / edition | Provenance | License / rights finding | Redistribution status | Decision |
|---|---|---|---|---|---|
| Sunnah.com | Multiple major collections | Official Sunnah.com API | API access requires an API key; public developer material does not establish a corpus-wide redistribution grant. | Not proven | **BLOCKED** |
| fawazahmed0/hadith-api | Multiple major collections | GitHub branch `1`, audited commit `df57907be35291c91ad6a6691180e22ca9920784` | Repository is Unlicense, but the underlying collection and third-party translation rights are not proven as a complete redistributable corpus. | Not proven | **BLOCKED** |
| Jaguar16/open-hadith-data | Structured Hadith corpus | GitHub repository | Code/data are presented under permissive licenses, but English translations are sourced from Sunnah.com and require separate rights review. | Mixed/uncleared | **BLOCKED** |
| i-muslim downloads | Classical Arabic Hadith editions | First-party download documentation | Classical Arabic editions may be public domain and the site describes a permissive model, but the exact assembled files lack immutable edition provenance in this audit. | Unknown | **REQUIRES CLARIFICATION** |
| OpenITI | Arabic historical Hadith/text corpus | OpenITI project | CC BY-NC-SA 4.0; non-commercial restriction prevents use as a generally distributable commercial dataset. | Restricted | **BLOCKED** |

No Hadith text, number, grading, Arabic, or translation is bundled.

## B. Quran translations

| Candidate | Edition | Provenance | Rights finding | Redistribution status | Decision |
|---|---|---|---|---|---|
| Marmaduke William Pickthall | `The Meaning of the Glorious Koran` (1930) | Project Gutenberg eBook #16955; underlying 1930 work by Pickthall | Project Gutenberg identifies eBook #16955 as public domain in the USA. NoorTools preserves translator/source attribution and does not rewrite the source wording. | Cleared for the verified 6,232-record Gutenberg transcription, subject to applicable local law. | **CLEARED** |
| Tanzil translation collection | Multiple translations | Tanzil | Translation terms are non-commercial and restrict redistribution to another website without permission. | Not cleared | **BLOCKED** |
| Quran Foundation Content API translations | Multiple translations | Official QF developer terms | Display in an application is not a blanket raw-content redistribution grant. Separate written permission is required for redistribution. | Not cleared for bundled data | **BLOCKED** |
| The Clear Quran | Dr. Mustafa Khattab | Official publisher/site | Copyrighted; no open redistribution license established during audit. | Not proven | **BLOCKED** |

### Pickthall ruthless audit

Canonical Quran numbering was independently checked from the existing verified 114-surah / 6,236-ayah partition. The distributable Pickthall set is now **6,232 exact records**, each with a stable ID of the form `quran-translation:en:pickthall-1930:<surah>:<ayah>` and a per-record SHA-256 of its exact imported text.

The 6,232 distributable records are re-parsed from the exact Project Gutenberg transcription and compared record-by-record during CI. The source hash is checked against a fresh download on every test/build run.

The four canonical IDs absent from the Gutenberg transcription are deliberately **not distributed**:

| Canonical ID | Printed page in audited 1930 scan | Why absent from Gutenberg | Exact source used for audit | Edition / publisher | Digitization | Manual correction | Shipping status |
|---|---:|---|---|---|---|---|---|
| `17:33` | 285 | No corresponding record in the Gutenberg transcription. | Internet Archive item `in.ernet.dli.2015.216140`, full-text derivative; scan is the same titled 1930 work. | `The Meaning of the Glorious Koran` (1930), George Allen & Unwin | Physical scan with ABBYY OCR-derived full text | **No correction shipped**; prior fallback rejected after OCR showed a transcription error. | unavailable_pending_verification |
| `39:46` | 478 | No corresponding record in the Gutenberg transcription. | Same Internet Archive item and OCR full-text derivative. | Same 1930 edition / George Allen & Unwin | Scan + ABBYY OCR-derived full text | **No correction shipped**; prior fallback not treated as source text. | unavailable_pending_verification |
| `45:32` | 516 | No corresponding record in the Gutenberg transcription. | Same Internet Archive item and OCR full-text derivative. | Same 1930 edition / George Allen & Unwin | Scan + ABBYY OCR-derived full text | **No correction shipped**; OCR wording conflicts with the former hardcoded fallback (`conjecture` vs `opinion`), so fallback was rejected. | unavailable_pending_verification |
| `56:26` | 562 | No corresponding record in the Gutenberg transcription. | Same Internet Archive item and OCR full-text derivative. | Same 1930 edition / George Allen & Unwin | Scan + ABBYY OCR-derived full text | **No correction shipped**; OCR evidence directly conflicts with the former fallback, which was rejected. | unavailable_pending_verification |

The audited Internet Archive text is an OCR derivative, not a page-image transcription that has been manually normalized by NoorTools. Because OCR errors are demonstrable in the source, its text alone is insufficient to establish the exact distributable wording for the four missing records. Therefore no text from those four records is copied into the distributable translation dataset.

For the four excluded records, `sourceHash` and `recordContentHash` are intentionally `null` in the distributable metadata because no unambiguously verified record text is being shipped. The Internet Archive full-text source itself is preserved as audit evidence only; its audit source hash is not treated as a record text hash.

No Tanzil Arabic text is used to reconstruct English. No AI reconstruction is used. No record is silently merged from a different translation edition.

## C. Quran audio

| Candidate | Provider / reciter | Rights finding | Redistribution status | Decision |
|---|---|---|---|---|
| Quran Foundation recitations | Multiple reciters | Recording-specific redistribution grant not established; third-party rights may apply. | Not cleared | **BLOCKED** |
| EveryAyah | Multiple reciters | No sufficiently explicit current redistribution grant for NoorTools established during audit. | Not proven | **BLOCKED** |
| Third-party mirrors/CDNs | Multiple reciters | Accessibility does not establish recording rights. | Unknown | **BLOCKED** |

No audio files are bundled or offered for download.

## D. Verification and scholar review

`source_verified` means source/provenance/license metadata has been checked. It does **not** mean a scholar has reviewed the religious content.

Allowed states:
- `source_verified`
- `pending_scholar_review`
- `scholar_reviewed`
- `needs_correction`
- `unavailable`

The Pickthall translation remains `pending_scholar_review`. The UI is explicitly written to avoid a generic `Scholar Verified` claim, and the independent audit script fails if that phrase is introduced.

## E. Primary source URLs

- Sunnah.com developers: https://sunnah.com/developers
- fawazahmed0/hadith-api: https://github.com/fawazahmed0/hadith-api/tree/1
- fawazahmed0 audited commit: `df57907be35291c91ad6a6691180e22ca9920784`
- Jaguar16/open-hadith-data: https://github.com/Jaguar16/open-hadith-data
- i-muslim downloads: https://i-muslim.com/id/downloads
- OpenITI documentation: https://openiti.org/documentation/
- Project Gutenberg eBook #16955: https://www.gutenberg.org/ebooks/16955
- Project Gutenberg exact text: https://www.gutenberg.org/ebooks/16955.txt.utf-8
- Internet Archive scan: https://archive.org/details/in.ernet.dli.2015.216140
- Internet Archive OCR/full-text derivative: https://archive.org/stream/in.ernet.dli.2015.216140/2015.216140.The-Meaning_djvu.txt
- Tanzil translations: https://tanzil.net/trans/
- Quran Foundation developer terms: https://api-docs.quran.com/legal/developer-terms/
- EveryAyah: https://everyayah.com/

## F. Audit rule

Where a specific religious dataset, translation edition, or recording cannot be shown to be redistributable and provenance-safe, NoorTools leaves it unavailable. No legal conclusion is based solely on another app using the material.
