# Bokhyllans karta

*Genomgång 17 oktober 2026, efter flera-användare-arbetet (PR1–PR5a). Ersätter
helt genomgången från 27 augusti — den byggde på ett läge (böcker delvis i en
fil, ingen inloggning krävd för läsning, en enda användare) som inte finns
längre. Detta är facit nu.*

---

## Arkitekturen i korthet

Statisk sida utan byggkedja — `index.html`, `js/app.js` (en enda
async-funktion, ~2050 rader), `css/style.css`. Publiceras via GitHub Pages vid
merge till `main`. All data bor i Supabase (`zuesxdqifsnvhleiukum`), RLS på för
alla tabeller. En edge function (`analysera`) sköter bildanalysen via Claude.

**Allt är per bibliotek sedan PR3/PR4.** Varje konto (inkl. anonyma, se nedan)
hör till minst ett `libraries`, och varenda rad i katalogen har en
`library_id`. De gamla filerna `data/books.json`, `data/gaps.json`,
`data/bookinfo.json` är arkiverade och läses inte längre — **med ett
undantag**, se glapp 1 nedan.

### Inloggning

- `signInWithPassword` för riktiga konton.
- **Sedan PR5a: `signInAnonymously` körs automatiskt** om ingen session finns,
  så en ny besökare kommer rakt in och kan bygga sin hylla innan de skapar
  konto. Inloggningsskärmen (`view-login`) visas bara om den anonyma
  inloggningen själv misslyckas (t.ex. nätverksfel).
- En trigger på `auth.users` (`handle_new_user`, PR5a) skapar automatiskt ett
  `libraries`-bibliotek + en `library_members`-rad (roll `owner`) för **varje**
  nytt konto, anonymt eller riktigt. Utan den triggern har ett nytt konto
  ingenstans att skriva.
- E-postbekräftelse är avstängd i Supabase-inställningarna (Thomas stängde av
  den under arbetet med PR5a).
- **Ej byggt än:** vägen från anonymt konto till riktigt konto ("spara din
  hylla", namnge biblioteket, glömt lösenord) — det är PR5b, inte påbörjad.

### Databasmodellen (efter PR4)

Två nycklar hänger ihop varje rad: `library_id` (direkt kolumn på nästan alla
tabeller sedan PR4) och platskoden `bc` (t.ex. `"1"`, med underkoder som
`1:V3` för vänster plan 3, `1:L1` för en lös plats). **`bc` är bara unik
INOM ett bibliotek**, inte globalt — det är poängen med PR4.

| Tabell | Innehåll | library_id? |
|---|---|---|
| `libraries` | Ett bibliotek per ägare, `name` (default "Mitt bibliotek") | är själv nyckeln |
| `library_members` | Medlemskap, roll `owner`/`member` | — |
| `bc_names` | Platsers/hyllors namn, `parent_bc` (gruppering), `hidden` | ja, unik (library_id, bc) |
| `manual_books` | Böckerna. Unik på (titel, författare, hyllkod) normaliserat | ja |
| `book_status` | Status (hylla/utlånad/flyter), lånad till, sedd-datum | — (kopplar via book_id → manual_books) |
| `book_cat` | Kategori per bok | ja |
| `book_cover` | Omslagsöverskrivning per bok | ja |
| `cat_renames` | Namnbyten på kategorier | ja |
| `gaps` | Registrerade luckor (oläsbara partier) | ja |
| `gap_status` | Status + foto + Claude-anteckning per lucka | ja |
| `shelves` | Hyllregister (Fas 2.4) | ja — **0 rader i produktion**, verkar aldrig ha fyllts |
| `spot_names` | Namn på lösa platser (`bc:L<n>`) | ja |
| `new_shelves` | Kö för nya/uppdaterade hyllfoton, väntar på granskning | ja |
| `shelf_shares` | Delning av en plats med någon utanför biblioteket | ja |

RLS-mönstret är genomgående: `can_read_bc(library_id, bc)` och
`can_admin_bc(library_id, bc)` (SECURITY DEFINER-funktioner i
`20261016133435_platskoder_per_bibliotek.sql`) slår upp antingen
biblioteksmedlemskap (`is_library_member`) eller en rad i `shelf_shares`.
Tabeller som pekar på en bok/lucka istället för en bar platskod (`book_cat`,
`book_cover`, `gap_status`) joinar till `manual_books`/`gaps` för att komma åt
`bc`. Insert-triggers (`set_library_id_from_caller`/`_from_book`/`_from_gap`)
sätter `library_id` automatiskt från den inloggades medlemskap — **aldrig**
genom att slå upp en bar bc-sträng, eftersom den inte längre är global (en
bugg som faktiskt triggades och fixades under PR4:s egen testning).

---

## Edge function `analysera`

`supabase/functions/analysera/index.ts`. Tar emot `{kind, id, cats}` +
JWT, läser `photo_data` ur `gap_status` eller `new_shelves`, skickar till
Claude, skriver tillbaka `claude_note`.

**Viktigt att veta:** funktionen kör med **service-role-nyckeln**, som går
runt RLS helt. Den kontrollerar bara att anroparen har en giltig inloggad
session (`auth.getUser()` lyckas) — **den kontrollerar aldrig att den
inloggade faktiskt har rätt till just den raden/det biblioteket den frågar
om.** Så länge RLS-skyddade vägar (`sb.from(...)` i appen) är det enda sättet
att få reda på ett `id`, märks det inte i praktiken. Men det är ett eget,
separat hål i biblioteksisoleringen jämfört med databasens RLS — värt att
täppa till om id:n (särskilt `new_shelves.id`, som är ett vanligt
löpnummer) någonsin blir gissningsbara eller läcker ut. **Inte åtgärdat.**

---

## Bildlagring — delvis åtgärdat 19/10

**Klart (PR #32, #36, och direktändring i Storage 19/10):**
- Alla tre uppladdningsställena (`uploadShelfPhoto`, gap-foto, omslag) och
  Hem-rutnätets läsning går nu via `createSignedUrl`, ingen `getPublicUrl`
  kvar i den riktiga koden.
- `gap-photos`-bucketen är satt till privat (`public: false`), ändrat direkt
  i Storage 19/10. De 18 foton som redan laddats upp via appen (sedan 26/8)
  påverkades inte — de läses redan via signerade länkar.
- `DEFAULT_BC` (Thomas riktiga rumsnamn hårdkodade i publicerad JS) är tom
  (PR #36, mergad 19/10).

**Kvarstår 1 — nytt bibliotekshål i Storage, upptäckt 19/10:** RLS-policyn
`gap photo read` på `storage.objects` tillåter läsning av **alla** objekt i
`gap-photos`-bucketen för vilken inloggad användare som helst
(`bucket_id = 'gap-photos'`, inget bibliotekskrav). Filnamnen har heller
ingen bibliotekskoppling (`shelf-<tidsstämpel>.jpg`, `b2p2V-1-<tidsstämpel>.jpg`
— bara hyllkod, ingen `library_id`). Ofarligt så länge det bara finns ett
riktigt bibliotek (idag), men blir ett verkligt läckage så fort ett andra
bibliotek skapar konto och laddar upp — **bör fixas innan cykel 3
(självregistrering för främlingar) går live**. Rätt fix: döp om filerna med
ett `library_id/`-prefix och byt policyn att matcha mot
`storage.foldername(name)[1]`, enligt samma mönster som redan finns för
`uh-inlamningar`-bucketen.

**Kvarstår 2 — gamla foton i repot:** `data/photos.json` + `img/` (36 foton,
80 filer, 8 MB) är fortfarande committade och publiceras okrypterat via
GitHub Pages — bekräftat nåbart på
`https://tringenr.github.io/bokhyllan/data/photos.json`. Det är fortfarande
den **enda källan** till omslagsfoto i Hem-rutnätet (`placeList()` bygger
`cover` uteslutande ur `PH`-arrayen som fylls från den filen), så filen går
inte att ta bort utan att först migrera in fotona i `bc_photos`-tabellen
(skapad i migrationen `bc_photos_privat_lagring`, 0 rader hittills) och
ersätta `placeList()`:s källa. Kräver att originalfotona laddas upp till
Storage — ett separat steg, inte påbörjat.

---

## Appens flöden, kort

| Flöde | Funktion/vy i koden | Läge |
|---|---|---|
| Sök/bläddra/status | `render()`, `bookRow()`, filter på `#fShelf`/`#fCat`/`#q` | Fungerar |
| Platshantering (byt namn, slå ihop, dela, dölj) | `renderBcEditor()`, `placeMerge` m.fl. | Fungerar |
| Ny hylla (foto → kö → granskning → spara) | `uploadShelfPhoto`, `new_shelves`, analysera-anropet | Fungerar, men delar bildproblemet ovan |
| Luckor | `gaps`/`gap_status`, samma analysflöde | Fungerar, delar bildproblemet |
| Kategorier | `cat_renames`, `book_cat` | Fungerar |
| Sälj | Egen flik (`view-salj`) | Manuell, oförändrad sedan augusti |
| Dela | `view-delade`, `shelf_shares` | Fungerar |
| Inställningar | `view-set` | Fungerar |

De nio gamla glappen från augusti (två sanningar i katalogen, dubbletter,
utloggad läsning, etc.) är **lösta** av Fas 2–4-arbetet: all katalog bor i
databasen, dublettregel finns på `manual_books`, och läsning kräver inloggning
(tillgodosedd automatiskt av den anonyma sessionen sedan PR5a). De listas
därför inte längre här.

---

## Säljlistan har samma glapp som bildlagringen hade

Upptäckt 20/10 (Thomas märkte att säljlistan syns utloggad). `data/sell.json`
är en delad fil i repot, läst med vanlig `fetch("data/sell.json"+DV)`
(~rad 944 i `js/app.js`) helt utanför Supabase/RLS — ingen inloggningskoppling
alls, samma mönster som fotofilen hade. Fungerar obemärkt så länge det bara
finns en användare (idag), men Thomas bekräftar: är tänkt att vara **privat
per bibliotek**, inte publik eller delad mellan användare. Rätt fix: flytta
säljdatan till en databastabell med `library_id` + RLS (samma mönster som
`manual_books` m.fl.), skriv om `renderSell()`/hämtningen, migrera in
nuvarande `data/sell.json`-innehåll, ta bort filen. Inte påbörjat.

---

## Öppet just nu (20 oktober 2026)

1. **Storage-bucketens bibliotekshål** (`gap-photos`, se ovan) — upptäckt
   19/10. Ofarligt idag (ett bibliotek), måste fixas innan cykel 3
   (självregistrering för främlingar). Inte påbörjat.
2. **Säljlistans glapp** (ovan) — upptäckt 20/10, samma allvarsgrad som
   Storage-hålet. Inte påbörjat.
3. **De 36 gamla fotona** i `data/photos.json`/`img/` — kräver att de laddas
   upp till Storage och `bc_photos`-tabellen fylls innan filen kan tas bort.
   Inte påbörjat.
4. **`analysera`-funktionens bristande behörighetskontroll per bibliotek** —
   identifierad 17/10, inte åtgärdad.
5. **PR #28** (ta bort den övergivna CI-automationen) — öppnad, status för
   merge inte bekräftad på nytt efter att den byggdes.
6. **PR5b** — spara-din-hylla/claim-flödet för anonyma konton, biblioteksnamn,
   glömt lösenord. Inte påbörjad.
7. **`shelves`-tabellen (Fas 2.4) har 0 rader i produktion** trots att
   kommentarer i koden antyder att den skulle fyllas — verkar vara ett dött
   spår, inte undersökt vidare.

**Klart sedan 17/10** (för historiken): bildlagringens kodsida och
bucket-sekretess (PR #32, #36, direktändring 19/10), DEFAULT_BC-fixen
(PR #36), den trasiga auto-migrate-CI:n borttagen och ersatt med direkta
migreringar via Claude (PR #35).

---

*Sammanställd ur koden i `tringenr/bokhyllan` (grepp över `js/app.js`, samtliga
filer i `supabase/migrations/`, och `supabase/functions/analysera/index.ts`)
samt produktionsdatabasen `zuesxdqifsnvhleiukum`, uppdaterad 20 oktober 2026.*
