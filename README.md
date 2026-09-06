# Bokhyllan

Familjens bokkatalog — ca 720 böcker på 8 platser, med hyllfoton, sök, status (på plats/utlånad/flyter runt) och bokbeskrivningar.

## Dokumentation
- [`docs/SAMMANFATTNING.md`](docs/SAMMANFATTNING.md) — projektsammanfattning: vad som byggts, teknik, säljbevakning, kvarvarande arbete
- [`docs/OVERLAMNING.md`](docs/OVERLAMNING.md) — överlämningsprompt att klistra in i en ny chattråd

## Struktur
- `index.html`, `css/`, `js/` — statisk webapp (ingen byggkedja)
- `data/photos.json` — hyllfoton med koppling till hyllkoder (kvarvarande fil; arkiveras i Fas 3a)
- `img/` — hyllfoton (full + thumb)
- `supabase/migrations/` — schemamigreringar för bokkatalogen (bor sedan Fas 2 i databasen: `manual_books`, `gaps`, `shelves` m.fl.)
- `archive/` — filer som var appens katalogsanning innan Fas 2, migrerade in i Supabase

Hyllkoder: `bokhylla:sektion+plan`, t.ex. `1:V3` = bokhylla 1, vänster sektion, plan 3 (räknat nedifrån). `S`=hylla, `K`=köket.

## Backlogg

### Klart
- ✅ **Luckor** (Inställningar → Luckor) — 51 olästa partier granskade: 47 lösta, 16 nya böcker inlagda, 4 kvar som behöver närbild
- ✅ **Kategoriredigering** — byt namn/slå ihop i Inställningar, ändra kategori per bok i popupen
- ✅ **Bokomslag** — hämtas live från Open Library, egen kamerauppladdning när omslag saknas
- ✅ **Lägg till/uppdatera hylla via foto** — kö som Claude läser av
- ✅ **Delafunktion** — 🔗 i appraden, färdig text + systemets delningsmeny

### Kvar
- **Automatisk diff vid hylluppdatering** — idag läser Claude av den uppladdade bilden manuellt; på sikt jämföra mot befintlig katalog och föreslå ändringar

### Teknik & data
- Veckobevakning sälj: automatisk prisuppdatering av `data/sell.json` (Studentapan)
- Bokbörsens efterlysningar — kräver webbläsarläsning (JS-renderad sajt)
- Exakta bokmarkeringar på hyllfotona (koordinater per bokrygg)
- Kvalitetssäkra bokbeskrivningarna mot Google Books/Open Library
- Arbetsrummet & barnens rum (nya foton)
- Kökets nedersta hylla + rödmarkerade svårlästa partier
