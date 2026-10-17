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

## Bildlagring — det stora öppna glappet

Tre ställen i `js/app.js` laddar upp foton, alla till samma Supabase
Storage-bucket `gap-photos`, alla via `getPublicUrl` (ingen `createSignedUrl`
någonstans i koden):

- `uploadShelfPhoto` (~rad 1639, "Ny hylla"-guiden)
- gap-foto-uppladdningen (~rad 1094)
- omslags-uppladdningen (~rad 1511)

**`gap-photos`-bucketen är satt till publik** (`public: true` i
`storage.buckets`, skapad 2026-08-26). Det betyder att varje foto som någonsin
laddats upp genom appens normala funktioner ligger på en publikt nåbar URL,
oavsett inloggning — inte bara gamla data, utan allt som laddas upp även
framöver om inget ändras.

**Dessutom**, separat från bucketen: `data/photos.json` + `img/` (36 foton,
80 filer, 8 MB) är committade i repot och publiceras okrypterat via GitHub
Pages — reda bekräftat nåbart på
`https://tringenr.github.io/bokhyllan/data/photos.json`. Det här är den
**enda källan** till omslagsfoto i Hem-rutnätet idag (`placeList()` bygger
`cover` uteslutande ur `PH`-arrayen som fylls från den filen) — så den går
inte att bara ta bort utan att först ersätta den funktionen.

Ingen av de två är åtgärdad än. Rätt fix är densamma för båda: gör
`gap-photos` privat, byt alla fyra läs/skrivställen (tre uppladdningar + Hem-
rutnätets omslagsvisning) till signerade länkar, och migrera in de 36 gamla
fotona i samma system innan filen och `img/`-mappen tas bort ur repot.

**`DEFAULT_BC`** (Thomas riktiga rumsnamn hårdkodade i den publicerade JS-
koden) är redan åtgärdad i kod (tom `{}`, faller tillbaka på "Plats N" /
riktiga namn laddas från databasen) men ligger i en opushad/omergad gren,
`teknik/dolj-riktiga-rumsnamn-i-kod` (PR #30) — väntar på klartecken.

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

## Öppet just nu (17 oktober 2026)

1. **Bildlagringen** (ovan) — störst, inte påbörjad.
2. **`analysera`-funktionens bristande behörighetskontroll per bibliotek** —
   identifierad idag, inte åtgärdad.
3. **PR #30** (DEFAULT_BC-fixen) — byggd, väntar på klartecken att mergas.
4. **PR #28** (ta bort den övergivna CI-automationen) — öppnad, status för
   merge inte bekräftad på nytt efter att den byggdes.
5. **PR5b** — spara-din-hylla/claim-flödet för anonyma konton, biblioteksnamn,
   glömt lösenord. Inte påbörjad.
6. **`shelves`-tabellen (Fas 2.4) har 0 rader i produktion** trots att
   kommentarer i koden antyder att den skulle fyllas — verkar vara ett dött
   spår, inte undersökt vidare.

---

*Sammanställd ur koden i `tringenr/bokhyllan` (grepp över `js/app.js`, samtliga
filer i `supabase/migrations/`, och `supabase/functions/analysera/index.ts`)
samt produktionsdatabasen `zuesxdqifsnvhleiukum`, 17 oktober 2026.*
