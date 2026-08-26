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

### Funktioner framåt
- **Uppdatera hylla via foto** — ladda upp en ny bild av en hylla/bokhylla och låta katalogen uppdateras (nya/borttagna böcker diffas in)
- **Lägg till ny hylla** — ny plats med böcker direkt i appen
- **Delafunktion** — delbar länk/bild för sociala medier: "titta i min bokhylla — vill du låna någon / prata om någon?"
- **Bokomslag i popupen** — framsidan visas i beskrivnings-popupen (hämtad från nätet); saknas bild visas en uppladdningsruta där man kan fota omslaget själv
- **Redigera kategorietiketter** — byta namn på etiketter, lägga till/ta bort etiketter, och ändra vilka etiketter en bok har
- ~~Svårläst-lista~~ **KLAR** — Luckor-vyn (Inställningar → Luckor): 51 olästa partier med utsnitt, handinmatning och fotouppladdning till Claude-kö

### Teknik & data
- Veckobevakning sälj: automatisk prisuppdatering av `data/sell.json` (Studentapan)
- Bokbörsens efterlysningar — kräver webbläsarläsning (JS-renderad sajt)
- Exakta bokmarkeringar på hyllfotona (koordinater per bokrygg)
- Kvalitetssäkra bokbeskrivningarna mot Google Books/Open Library
- Arbetsrummet & barnens rum (nya foton)
- Kökets nedersta hylla + rödmarkerade svårlästa partier
