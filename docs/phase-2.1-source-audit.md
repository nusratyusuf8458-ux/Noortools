# Phase 2.1 — Quran source audit

## Tanzil Uthmani v1.1

Source: Tanzil Project — https://tanzil.net

Version: 1.1, released February 12, 2021.
Edition: Uthmani.

Tanzil's published text terms state that verbatim copies may be copied and distributed, including use in websites and applications, provided the source is clearly indicated and a link to tanzil.net is supplied. The text may not be changed. The copyright notice must accompany verbatim copies and substantial derivatives.

The exact download configuration selected for NoorTools is:

`quranType=uthmani&outType=txt-2&agree=true&marks=true&sajdah=true&rub=true&stanween=true`

No translation or audio dataset is being bundled from Tanzil in Phase 2.1 because Tanzil's translation page states that its translation files are non-commercial and that redistribution on another website is not permitted without direct permission.

## Distribution decision

NoorTools is a browser/PWA-style application. The Tanzil terms expressly permit use in an application, subject to attribution, the tanzil.net link, verbatim text preservation and inclusion of the copyright notice. This is the basis for the integration path.

The canonical Quran source file is downloaded directly from Tanzil by the deterministic import script during content builds. CI validates the resulting 114-surah / 6,236-ayah structure, stable IDs and source hash. The source file is never normalized or rewritten before storage.

## Verification boundary

`verificationStatus: verified` means the imported record passed source/provenance, structural and integrity checks against the named Tanzil source. It does **not** mean a NoorTools scholar has reviewed the content.

`reviewStatus: not_reviewed` remains until a qualified human reviewer actually reviews the dataset.

## Change control

The generated manifest records the exact downloaded byte hash. A future release must compare against the pinned release manifest before publishing updated canonical text. Any upstream hash change must be treated as a content update requiring review; it must not silently replace an existing published dataset.
