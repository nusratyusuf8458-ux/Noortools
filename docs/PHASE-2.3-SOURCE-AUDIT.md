# Phase 2.3 — Source + License + Redistribution Audit

Audit date: 2026-09-14

This audit is deliberately conservative. A public website, open endpoint, or repository license is not treated as permission to redistribute third-party religious text or recordings unless the specific data/edition is covered.

## A. Hadith

| Candidate | Collection / edition | Provenance | License / rights finding | Redistribution status | Decision |
|---|---|---|---|---|---|
| Sunnah.com | Multiple major collections | Official Sunnah.com API | API access requires an API key; Sunnah.com says an offline dump was not available. No corpus-wide redistribution grant was identified in the public developer material. | Not proven | **BLOCKED** for bundling |
| fawazahmed0/hadith-api | Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah and other editions | GitHub repository, branch `1`, audited commit `df57907be35291c91ad6a6691180e22ca9920784` | Repository `LICENSE` is Unlicense, but repository issues include an explicit open question about the license of the texts. The README also aggregates translations from multiple upstream sources. | Arabic classical text may be public-domain in principle; source/edition and third-party translation rights are not sufficiently proven as a complete redistributable corpus. | **BLOCKED** as a complete Hadith dataset |
| Jaguar16/open-hadith-data | Structured Hadith corpus | GitHub repository | Code MIT; structured data stated CC0; English translations are sourced from Sunnah.com and explicitly require separate rights review. | Mixed rights; English redistribution unresolved. | **BLOCKED** for bundled religious content |
| i-muslim downloads | Arabic Hadith collections + some authored translations | First-party i-muslim download/API documentation | i-muslim states classical Arabic Hadith editions are public domain and its own authored translations are CC0; mirrored third-party translations are metadata-only. However, the public page does not provide an immutable repository commit for the assembled Arabic edition files. | Potentially usable for Arabic-only runtime data, but immutable edition provenance is not yet strong enough for this release. | **REQUIRES CLARIFICATION** |
| OpenITI | Arabic historical text corpus | OpenITI project | CC BY-NC-SA 4.0. Corpus excludes in-copyright editorial matter, but commercial use is restricted by the license. | Not suitable for a generally distributed/commercial app. | **BLOCKED** |

### Hadith conclusion

No major Hadith collection is integrated in Phase 2.3. No Arabic or English Hadith text is copied into NoorTools merely because an API or repository exposes it. The Hadith UI remains an honest unavailable state until a collection-specific edition, numbering, source, and redistribution grant are proven.

## B. Quran translations

| Candidate | Edition | Provenance | License / rights finding | Redistribution status | Decision |
|---|---|---|---|---|---|
| Marmaduke Pickthall | `The Meaning of the Glorious Koran` (1930) | Project Gutenberg eBook #16955; original 1930 work corroborated by Wikimedia Commons | Project Gutenberg identifies the eBook as public domain in the USA. Wikimedia Commons records the 1930 work as public domain and notes Pickthall died in 1936, placing the work beyond life+70 and life+80 terms used by many jurisdictions. | Public-domain text is suitable for redistribution subject to local-law verification; NoorTools preserves attribution and source URLs anyway. | **CLEARED** for text integration |
| Tanzil translation collection | Multiple English/other translations | Tanzil | Tanzil says translations are non-commercial only and redistribution of the list is not allowed without direct permission. | Not cleared for NoorTools redistribution. | **BLOCKED** |
| Quran Foundation API translations | Multiple translations | Official Quran Foundation API | Developer terms permit display of QF Content inside an application but prohibit selling, sublicensing, or redistributing QF Content/raw API data without a separate written commercial license. | Runtime display may be possible under API terms; bundling/redistribution is not cleared. | **BLOCKED** for offline bundling |
| The Clear Quran | Dr. Mustafa Khattab | Official publisher | Official app/publisher materials identify copyright and authorized publishers; no open redistribution license was found. | No blanket redistribution permission established. | **BLOCKED** |

### Translation conclusion

Phase 2.3 integrates only Pickthall 1930, sourced from the public-domain work via Project Gutenberg's eBook #16955. It is represented as a separate translation edition and is never treated as part of the Tanzil Arabic record itself.

## C. Quran audio

| Candidate | Provider / reciter | Provenance | License / rights finding | Redistribution status | Decision |
|---|---|---|---|---|---|
| Quran Foundation / quran.com recitations | Multiple reciters | Official Quran Foundation API/documentation | QF terms allow app display of QF Content but prohibit redistribution of raw QF Content without a separate written license; QF notes recitation rights can belong to third parties. | Streaming/bundling rights not proven for the specific recording set. | **BLOCKED** for Phase 2.3 |
| EveryAyah | Multiple reciters | EveryAyah streaming site | No current primary licensing grant sufficiently establishing NoorTools redistribution of recordings was found during this audit. | Not proven. | **BLOCKED** |
| Third-party mirrors/CDNs | Multiple reciters | Community-hosted copies | Accessibility does not establish recording rights. | Unknown. | **BLOCKED** |

### Audio conclusion

No MP3/audio file is bundled. No reciter is represented as licensed. NoorTools shows an unavailable state rather than offering an unauthorized download or offline player.

## D. Verification/review policy

`source_verified` means the source/provenance/license metadata was checked. It does not mean a scholar has reviewed the religious text.

Allowed states:

- `source_verified`
- `pending_scholar_review`
- `scholar_reviewed`
- `needs_correction`
- `unavailable`

No fake reviewer name, credential, or date is created.

## E. Source URLs and evidence

- Sunnah.com developers: https://sunnah.com/developers
- fawazahmed0/hadith-api: https://github.com/fawazahmed0/hadith-api/tree/1
- fawazahmed0 audited commit: `df57907be35291c91ad6a6691180e22ca9920784`
- fawazahmed0 LICENSE: https://github.com/fawazahmed0/hadith-api/blob/1/LICENSE
- Jaguar16/open-hadith-data: https://github.com/Jaguar16/open-hadith-data
- i-muslim downloads/licence model: https://i-muslim.com/id/downloads
- OpenITI documentation: https://openiti.org/documentation/
- Project Gutenberg eBook #16955: https://www.gutenberg.org/ebooks/16955
- Project Gutenberg text source: https://www.gutenberg.org/ebooks/16955.txt.utf-8
- Wikimedia Commons 1930 Pickthall public-domain record: https://commons.wikimedia.org/wiki/File:The_Meaning_of_the_Glorious_Koran_(1930).pdf
- Tanzil translations terms: https://tanzil.net/trans/
- Quran Foundation Developer Terms: https://api-docs.quran.com/legal/developer-terms/
- The Clear Quran official site: https://theclearquran.org/

## F. Audit rule

Where the specific dataset/edition/recording cannot be shown to be redistributable, NoorTools leaves it unavailable. No legal conclusion is based solely on another app using the material.
