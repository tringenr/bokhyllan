# Arkiv

Filer som var appens katalogsanning innan Fas 2 (2026-08 till 2026-09).
Migrerade in i Supabase och läses inte längre av appen.

- `books-2026-08-migrated.json` — 737 böcker, nu i `public.manual_books` med `source='books-json-import'` (se migration `20260830190510_fas2_2_book_uid_owner_id`).
- `gaps-2026-08-migrated.json` — 51 luckdefinitioner, nu i `public.gaps` (se migration `20260905151910_fas2_5_gaps_register_and_fks`).
- `bookinfo-2026-08-migrated.json` — 490 beskrivningar, nu i `public.manual_books.description`.

Behåll som referens/tidsmarkering. Rör inte utan att uppdatera CLAUDE.md.
