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
- Supabase: delad status + familjeinloggning (ersätter localStorage)
- Exakta bokmarkeringar på fotona
- Kvalitetssäkra beskrivningar mot Google Books
- Arbetsrummet & barnens rum
