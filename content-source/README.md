# NoorTools content-source policy

Phase 2 never generates or silently edits religious source text.

## Quran Arabic

The planned Arabic Quran edition is **Tanzil Project, Uthmani, version 1.1**. Tanzil permits verbatim use in websites/applications under Creative Commons Attribution 3.0, requires clear source attribution and a link to tanzil.net, and prohibits changing the text. NoorTools therefore treats the source file as immutable input and records a SHA-256 integrity report.

Source: https://tanzil.net/download/
License: Creative Commons Attribution 3.0, with Tanzil's verbatim/no-modification terms.

Place the explicitly downloaded source file at `content-source/quran-uthmani.txt` only after accepting Tanzil's terms. Run:

```bash
npm run validate:quran
```

The validator checks 114 surahs, 6,236 ayahs, sequential numbering and produces a provenance report. A structurally valid import is **not** automatically scholar-reviewed. It remains `needs_review` until an explicit review decision is recorded.

The raw source file is intentionally not committed to NoorTools in this phase until the project confirms the intended redistribution/distribution terms for its deployment target.

## Translations, audio and other collections

No Quran translation, recitation, Names of Allah, Duas, Azkar or Hadith dataset is bundled in Phase 2 yet. Source-specific permissions vary; the app shows unavailable states rather than copying uncertain material.

Quran Foundation's Content APIs are a supported future provider for Quran text, translations, pages, juz, recitations and search. Its current developer terms allow display of QF Content inside an application subject to the terms, prohibit redistribution of raw API data, and require attribution; non-user Content API requests use application credentials and therefore belong behind a backend/proxy rather than in the browser.

Source: https://api-docs.quran.com/
