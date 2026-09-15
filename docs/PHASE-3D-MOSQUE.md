# Phase 3D — Mosque + Local Community Layer

## Scope
Phase 3D adds a production-oriented Mosque Finder foundation backed by real OpenStreetMap geospatial data. NoorTools does not bundle, seed, or fabricate mosque records. The UI exposes only fields returned by the provider adapter.

## Provider and legal review
Provider: OpenStreetMap geodata, queried through the public Nominatim geocoding service and the public FOSSGIS Overpass instance.

Data license: Open Database License (ODbL) 1.0. Attribution is displayed in the feature UI.

Service policies: Nominatim requires light use (maximum 1 request/second), identifiable User-Agent/Referer, and attribution. The public Overpass guidance says small-project use must stay within fair-use limits, requests must identify the application, calls should be cached/rate-limited, and commercial use should use self-hosted or paid infrastructure. NoorTools therefore does not claim unlimited public-server production capacity.

Tile policy: NoorTools does not embed or bulk-download OpenStreetMap tiles in Phase 3D. It opens an OpenStreetMap directions URL instead, avoiding a proprietary Google Maps dependency and avoiding prohibited OSM tile prefetch/offline behavior.

Caching: fetched mosque results are stored only in bounded local storage for up to six hours as a convenience cache. Cached results are visibly marked as cached/stale and are never presented as live. No background refresh is performed. A user-selected precise location is not persisted unless the user explicitly confirms Save; the feature's default live location remains in memory for the current session.

Privacy: precise browser location is requested only after the user presses Use my location. No analytics, tracking, advertising, or external location sync is implemented. Provider requests receive only the minimum coordinates/query needed for the selected search.

## Available fields
The OSM adapter may expose: name, structured address components when mapped, coordinates, phone/contact phone, website/contact website, opening_hours, selected source-tagged facilities, source record URL, and provider timestamp when supplied. Missing fields render as unavailable.

Jummah and mosque-specific prayer timetables are intentionally unavailable because the selected provider does not supply a verified structured mosque timetable that NoorTools can safely treat as authoritative. NoorTools calculated astronomical prayer times are never substituted for mosque-specific times.

## Reports
Report incorrect information supports wrong address, phone, hours, facility, timetable, duplicate, and closed mosque. The current flow prepares a local JSON submission package; it is not automatically transmitted to OSM or another provider.

## Location and offline behavior
The feature reuses the browser's standard permission flow and provides manual Nominatim search when permission is denied or unavailable. Timezone validation is performed before a location is accepted. The feature does not silently default to Mumbai, Makkah, or another location.

Previously cached results can be displayed after a failed live request with a stale-data warning. No offline OSM tile archive is created.

## Accessibility and security
The dialog supports keyboard focus-visible states, screen-reader labels, large touch targets, mobile layout, RTL search-result alignment, and reduced-motion preferences. Provider HTML is never injected. Coordinates, URLs, phone strings, query text, and provider fields are validated/sanitized before presentation.

## Testing
Coverage includes coordinate validation, Haversine straight-line distance, distance sorting, duplicate elimination, provider-field mapping, malformed geocoder responses, cache behavior, cached-result display, and the critical rule that missing mosque timetables stay unavailable rather than falling back to NoorTools calculated prayer times. Mosque-specific past/upcoming logic is tested only for a supplied timetable and explicit timezone.

## Android
The architecture uses browser-compatible geolocation, external directions, and local state patterns suitable for an eventual Android wrapper. Physical Android device testing was not performed and is not claimed.

## Known limitations
Public OSM service endpoints are best-effort, rate-limited infrastructure. A commercial/high-volume deployment should replace the public Overpass/Nominatim endpoints with self-hosted or contractually cleared infrastructure before launch. OSM data completeness varies by area. Provider freshness may lag the live map database. There is no live map canvas, provider-supplied mosque timetable, automatic report submission, road-distance calculation, or background location tracking in this phase.

References:
- https://osmfoundation.org/wiki/Licence
- https://operations.osmfoundation.org/policies/nominatim/
- https://wiki.openstreetmap.org/wiki/Overpass_API
- https://operations.osmfoundation.org/policies/tiles/
- https://www.openstreetmap.org/fixthemap
