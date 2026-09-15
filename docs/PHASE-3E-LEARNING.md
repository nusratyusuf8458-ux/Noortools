# Phase 3E — Seerah + Prophets + Sahaba + Islamic History + Learning

## Scope
Phase 3E delivers the production architecture and UX for Prophets, Sahaba, Seerah, Islamic History, Stories Mode, Islamic Learning, verified quizzes, source metadata, bookmarks, progress, private notes, global-search integration, sharing guards, and audio narration architecture.

## Religious-content policy
No historical or religious narrative is generated from model memory. `SEEDED_ITEMS` and `SEEDED_QUIZZES` are intentionally empty. The UI treats content as unavailable until exact source, provenance, license/redistribution rights, attribution, hash where applicable, and verification/review state are established.

## Sources investigated

### Cleared / catalogued
- Marmaduke William Pickthall, *The Meaning of the Glorious Koran* (1930), using the existing Phase 2.3 provenance and hash `3b96fa3ad318ab9d91db53b25100d5169fafe3a1ecb993e7c36ffff55bf9d8bc`. No new historical narrative is copied from it in Phase 3E.
- Sir William Muir, *The Life of Mahomet: From Original Sources*, 3rd edition (1894), Smith, Elder. Wikisource records the author's works as public domain worldwide. This is treated as a historical source only; review state is `pending_scholar_review`.

### Blocked
- Islam Question & Answer: current terms permit personal/non-commercial use but prohibit commercial redistribution or repurposing without prior consent. No site text was imported.

## Actual datasets integrated
None. This is deliberate: the learning architecture is production-ready, but no new religious/historical narrative is bundled without complete source clearance and review.

## Modules
The launcher provides Prophets, Sahaba, Seerah, Islamic History, Stories Mode, Islamic Learning and Quizzes. Each module has search, source registry visibility, empty/unavailable states, and a path for future cleared records.

## User state
Bookmarks, genuine reading progress, recent item history, quiz completion markers and private notes are local-only, versioned, bounded, and never merged with source content. Notes are explicitly labeled `USER NOTE`.

## Search
Global search now includes a `Learning` filter and can consume only non-unavailable Phase 3E records. Because the current approved registry contains no bundled narrative items, Phase 3E contributes no authoritative search results yet.

## Audio
Narration is architecture only. Audio is unavailable until a verified source-text record and a permitted narration provider are established. No AI-generated historical narration is used.

## Sharing / offline
Sharing is only enabled for records with a non-unknown license and available content. Offline storage is limited to user state; no uncleared source text is cached or bundled.

## Scholar review
Statuses are explicit: `source_verified`, `pending_scholar_review`, `scholar_reviewed`, `needs_correction`, `unavailable`. No fake scholar name, credential, review date or "Scholar Verified" label is generated.

## Android
Architecture is compatible with a future wrapper for navigation, local state, sharing and audio. Physical Android testing was not performed.

## Known blockers
1. Source-by-source scholarly/factual validation for narrative datasets.
2. Redistribution permission for modern copyrighted publishers.
3. Licensed narration provider.
4. Explicit handling of disputed historical claims before publishing them as educational fact.

## References
- https://en.wikisource.org/wiki/Author:William_Muir
- https://www.gutenberg.org/ebooks/16955
- https://islamqa.info/en/terms
