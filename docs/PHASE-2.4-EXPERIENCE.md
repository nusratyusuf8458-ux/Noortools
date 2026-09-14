# Phase 2.4 — Islamic Experience Layer

## Trust boundary

Phase 2.4 adds UX around the verified content foundation only. No new religious dataset is introduced. The canonical Quran Arabic dataset remains the completed Tanzil Uthmani v1.1 foundation; Phase 2.3 Pickthall remains the only bundled Quran translation and its four unresolved records stay unavailable.

No scholar has reviewed or approved content in NoorTools. The product uses explicit source/review states and does not display a scholar-verified claim.

## Reader

The Quran reader supports Surah, Juz and page navigation; explicit last-read saving; genuine per-ayah reading activity; reading history; progress; Arabic font size and line-height controls; light/dark reader modes; RTL Arabic rendering; bookmarks/favorites; local notes; copy/share attribution; and explicit unavailable translation states.

Rendering an ayah does not create reading activity. Reading activity is created only by the explicit user action to save/mark that ayah as read.

Search and highlighting are presentation-only. Search normalization may ignore Arabic combining marks and common Alef variants for matching, while the displayed Quran source string is never rewritten.

## Search

Premium search covers only available verified content: Quran Arabic, available Pickthall translation, 99 Names, Duas and Azkar. Results identify the content type and source/review state. Search history is stored locally under a versioned key, capped at 20 entries, sanitized, deduplicated newest-first, and clearable. Search history is never sent to NoorTools servers.

The four excluded Pickthall references remain unavailable and cannot be reconstructed or replaced by another translation.

## Local state

Content user state is version 3. Existing Phase 2.2 content state migrates without inventing bookmarks, progress, notes, or reminders. Favorites are user-controlled. Notes are user-generated and explicitly separated from source content.

## Daily experience

Daily Ayah, Dua, Dhikr and Name of the Day are selected deterministically from currently available verified datasets. These selections do not represent user activity and do not add religious content.

## Reminders

Reminder preferences support permission-aware enable/disable controls and local time selection for Prayer, Morning Azkar, Evening Azkar, Quran reading and Tasbih. Browser permission is requested only when the user asks. Background Android delivery is not claimed as tested.

## Privacy

No analytics, advertising SDKs, tracking, or sync service is introduced. User activity, bookmarks, notes, reminder preferences and search history remain local to the device/browser unless an explicitly separate future sync feature is added.

## Accessibility

Implemented in code: keyboard-focus styling, usable touch targets, native buttons/inputs, screen-reader labels for interactive search controls, RTL handling for Arabic result presentation, reduced-motion behavior, dark-mode contrast accommodations, and forced-colors focus handling.

Physical screen-reader/device-matrix certification is not claimed.

## Android status — NOT PHYSICALLY VERIFIED

The following remain **NOT PHYSICALLY VERIFIED** because no real Android device/emulator test was performed in this phase:

- real Android device behavior
- physical compass/sensor behavior
- Android notification delivery
- vibration behavior
- Android screen-reader/device matrix
- Android WebView/browser differences

Web/browser permission boundaries are implemented where possible, but they are not a substitute for physical Android validation.

## Release audit

The final Phase 2.4 review checks for seeded activity, fabricated religious content, fake scholar verification, analytics/tracking SDKs, unauthorized new religious datasets, missing attribution, unsafe localStorage parsing, accidental Quran-source mutation, and fake Android certification claims.

Phase 2.3 source/audit files are not modified by the Phase 2.4 polish work. No new religious data files are introduced by Phase 2.4.
