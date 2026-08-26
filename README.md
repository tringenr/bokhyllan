# Bokhyllan

Familjens bokkatalog — ca 720 böcker på 8 platser, med hyllfoton, sök, status (på plats/utlånad/flyter runt) och bokbeskrivningar.

## Struktur
- `index.html`, `css/`, `js/` — statisk webapp (ingen byggkedja)
- `data/books.json` — bokkatalogen (id, titel, författare, kategori, hyllkod)
- `data/photos.json` — hyllfoton med koppling till hyllkoder
- `data/bookinfo.json` — bokbeskrivningar
- `img/` — hyllfoton (full + thumb)

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
