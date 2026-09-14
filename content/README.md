# Verified content storage

Canonical Quran source bytes are generated from the official Tanzil download URL during the build. The source file and generated index remain identical in Arabic payload; application rendering must never mutate canonical text.

The importer records source ID/name/version, edition, license, reference, import version/date, SHA-256 content hash, and separate source verification versus scholar review status.

No religious dataset is considered scholar-reviewed until a real qualified reviewer is recorded with review date and notes.
