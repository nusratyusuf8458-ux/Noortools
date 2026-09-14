# Phase 2.4 — Islamic Experience Layer

## Trust boundary
Phase 2.4 does not add a new religious dataset. Quran Arabic continues to use the existing Tanzil Uthmani v1.1 source foundation. Pickthall remains the only bundled English Quran translation and remains incomplete by design: the four unresolved records are excluded and shown as `Translation unavailable for this record.` No replacement text is generated.

The product does not display a claim that a scholar verified the Phase 2.3 translation. Existing review metadata remains explicit.

## Local-first user data
Bookmarks, favorites, Quran last-read state, explicit read activity, reading history, notes, Azkar counts and reminder preferences are stored in local storage. No analytics, advertising SDK, tracking, or sync service is introduced by this phase.

Rendering an ayah does not create a read event. A read/last-read event is created only from the explicit user action exposed by the Quran reader.

Notes are user-authored data and are visually labeled `USER NOTE`; source text is labeled `SOURCE CONTENT`.

## Daily experience
Daily Ayah, Daily Dua, Daily Dhikr and Name of the Day use deterministic date-based selection over already available verified content. The selectors are pure and testable; they do not generate religious text.

## Notifications
The web layer stores permission-aware reminder preferences for Prayer, Morning Azkar, Evening Azkar, Quran reading and Tasbih. It requests browser notification permission only after an explicit user action. This is reminder preference/permission architecture, not a claim of fully tested Android background scheduling.

## Accessibility
The experience layer adds keyboard-visible focus styling, minimum touch target sizing for major controls, semantic labels for navigation and controls, explicit `dir="rtl"`/Arabic language metadata, forced-colors focus treatment, and reduced-motion behavior. Physical screen-reader and device-matrix validation remain manual QA items.

## Android boundary
The phase improves responsive/mobile layout, safe-area placement and permission-aware notification behavior. No physical Android device/emulator was available for this implementation pass, so back-stack behavior, Android notification delivery, lifecycle transitions, vibration behavior and device-specific rendering are not certified as physically tested.

## Performance boundary
Quran reading is scoped to a selected Surah rather than rendering all 6,236 ayahs at once. Search operates on verified in-memory runtime data and caps visible results. Large-scale device performance and physical Android profiling remain manual validation work.
