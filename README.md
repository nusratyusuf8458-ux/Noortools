# NoorTools — Phase 1

Privacy-first Islamic companion foundation built for `nusratyusuf8458-ux/Noortools`.

## Phase 1 included
- Responsive premium light/dark UI with accessible focus states and mobile-safe areas
- Explicit device/manual location selection; no silent default city or coordinate
- Coordinate-derived IANA timezone using `@photostructure/tz-lookup`; prayer dates/times use the selected location timezone, including DST-aware display
- Offline astronomical prayer calculation for Fajr, Sunrise, Dhuhr, Asr, Maghrib and Isha
- Current/next prayer and live countdown with timezone-safe after-Isha → next-local-day Fajr rollover
- User-selectable MWL/ISNA method, Asr shadow ratio and high-latitude fallback convention
- High-latitude strategies: angle-based, one-seventh of night, middle of night; if required solar boundaries are unavailable, affected prayers remain unavailable rather than being fabricated
- Qibla bearing from the Kaaba; real browser/device orientation when supported; explicit unsupported/denied sensor fallback with no simulated heading
- Salah tracker with genuine date-based local activity, streaks and 7/30-day statistics
- Tasbih counter with persistent count, sessions/history, undo, haptic/sound preferences and real statistics/streaks
- Versioned defensive local storage (schema v3) with v1/v2 migration
- Safe local-data JSON export/import with schema validation, migration, failure isolation and confirmation before replacement
- Android-facing web behaviors: permissions/error paths, orientation fallback, vibration fallback, browser back navigation, safe-area CSS, offline/foreground refresh and responsive small-screen layout
- Verified-content empty states for Quran/Hadith/Duas/library areas
- No analytics, ads, hidden tracking, fake activity, payment or religious-content generation

## Religious-content policy
No Quran, Hadith, Dua, Azkar, fiqh ruling, fatwa, scholar statement, or historical claim is invented here. Content integrations remain empty until verified/licensed sources are available and can be reviewed.

## Development
```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

## Android verification limit
This repository contains defensive browser/PWA-compatible paths, but no physical Android device or emulator is available in the current verification environment. Before any Play Store readiness claim, physically test location permission/denial/revocation, DeviceOrientation/compass behavior, vibration, back navigation, safe-area layout, restart, background/foreground transitions, offline/online transitions and representative Android screen sizes.

Phase 1 work is committed on the `phase-1` branch. GitHub Actions runs dependency installation, TypeScript check, lint, Vitest and the production build on push and pull requests targeting `main` or `phase-1`.
