# NoorTools — Phase 1

Privacy-first Islamic companion foundation built from scratch for the new `nusratyusuf8458-ux/Noortools` repository.

## Phase 1 included
- Responsive premium light/dark UI
- Explicit device/manual location selection (no silent default city)
- Offline prayer-time calculation with Fajr, Sunrise, Dhuhr, Asr, Maghrib and Isha
- Next-prayer countdown with tomorrow-Fajr rollover
- Qibla bearing from the Kaaba; no simulated device heading
- Salah tracker with genuine local activity only
- Tasbih counter, target, sessions and persistent totals
- Versioned defensive local storage and local-data reset
- Verified-content empty states for Quran/Hadith/Duas/library areas
- No analytics, ads, hidden tracking or fake activity
- TypeScript, Vitest tests and GitHub Actions verification workflow

## Religious-content policy
No Quran, Hadith, Dua, Azkar, fiqh ruling, fatwa, scholar statement, or historical claim is invented here. Content integrations remain empty until verified/licensed sources are available and can be reviewed.

## Development
```bash
npm install
npm run lint
npm test
npm run build
```

Phase 1 is implemented on the `phase-1` branch. CI is configured to run lint, tests and the production build on push/PR.
