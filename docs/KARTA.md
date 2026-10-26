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
- **Klart sedan PR 5 (21/10):** vägen från anonymt konto till riktigt konto.
  I Inställningar kan en anonym session lägga på e-post + lösenord på exakt
  samma session (`sb.auth.updateUser`) — samma `library_id`, samma data.
  Glömt lösenord (`view-login`, visas bara om den automatiska anonyma
  inloggningen själv misslyckas) skickar en återställningslänk och fångar
  den med en lyssnare på `PASSWORD_RECOVERY`-eventet. Bekräftat fungerande
  live, från mejl till nytt lösenord, 21/10.
- **E-postutskick går via Resend**, inte Supabases inbyggda (vars
  gratisnivå har en mycket låg gräns) — kopplat via egen SMTP mot domänen
  `cointelligence.se`, 21/10. Viktigt: Supabases "Redirect URLs" i
  Auth-inställningarna måste innehålla `https://tringenr.github.io/bokhyllan*`
  (med asterisk) — utan den matchade inte appens egen
  `location.origin+location.pathname` (som har ett avslutande snedstreck)
  den gamla posten utan asterisk, och återställningslänken landade då på
  bara `tringenr.github.io` utan sökväg.
- Namnge biblioteket är fortfarande inte byggt — ingår i PR 6
  (tomt-läge-guiden), inte påbörjat.

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

## Bildlagring — klart 20/10 (utom de gamla repo-fotona)

**Klart (PR #32, #36, #39, och direktändringar i Storage 19–20/10):**
- Alla tre uppladdningsställena (`uploadShelfPhoto`, gap-foto, omslag) och
  Hem-rutnätets läsning går nu via `createSignedUrl`, ingen `getPublicUrl`
  kvar i den riktiga koden.
- `gap-photos`-bucketen är satt till privat (`public: false`), ändrat direkt
  i Storage 19/10.
- `DEFAULT_BC` (Thomas riktiga rumsnamn hårdkodade i publicerad JS) är tom
  (PR #36, mergad 19/10).
- **PR 4.5 (mergad 20/10):** Storage-bibliotekshålet (se nedan, historik)
  är stängt. `js/app.js` har en ny `myLibraryId()`-hjälpare; alla nya
  uppladdningar läggs under `<library_id>/` i bucketen. RLS-policyn på
  `storage.objects` (`gap photo read v2`/`write v2`) kräver numera
  medlemskap i biblioteket, samma mönster som `uh-inlamningar`-bucketen.
  De 18 befintliga objekten flyttades till rätt mapp i Storage-gränssnittet,
  och en sidoeffekt hittades och fixades samtidigt: 9 av dem låg i databasen
  som hela gamla publika webblänkar (kvarleva från innan bucketen blev
  privat 19/10) och gick därför inte att visa i fullskärm — uppdaterade till
  rätt sökvägsformat i samma SQL-körning.
- Lokalt verifierat innan produktion rördes (samma metod som PR 1–4): två
  bibliotek i testdatabasen, varsin medlem, varsitt foto — korskoppling
  blockerades av RLS på både läsning och skrivning.

**Löst 26/10:** `data/photos.json` + `img/` (36 foton, 80 filer, 8 MB) låg
fortfarande committade och publicerades okrypterat via GitHub Pages, trots
att `js/app.js` sedan migrationen till `bc_photos` (17/10) slutat läsa filen
— resultatet blev att 6 av 7 hyllor i Hem-rutnätet visade tomma grå rutor
(upptäckt av Thomas 26/10, `bc_photos` hade fortfarande 0 rader). Åtgärdat:
de 36 fotona importerade (Thomas körde ett engångsskript inloggad i appens
konsol, se `claude/rapport-hyllfoton-bc-photos-2026-10-26.md`) till den
privata `gap-photos`-bucketen + `bc_photos`-tabellen, och filen/mappen är
borttagna ur repot. `placeList()`:s `cover` och "sågs senast" (`FLAT`) byggs
nu ur `PH`, som fylls av både `loadBcPhotos()` (`bc_photos`) och
`syncShelfPhotos()` (`new_shelves`) — ingen kod i `js/app.js` behövde ändras,
bara datan som saknades.

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
| Dela | `view-delade` | **Inte byggd.** Fliken visar "Kommer snart" och kopierar bara appens adress; `shelf_shares` finns i databasen men anropas aldrig från `js/app.js`. Kopplat till fas 4 (delning av bibliotek, hösten 2027) |
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

## Öppet just nu (21 oktober 2026)

1. **Säljlistans glapp** (ovan) — upptäckt 20/10, samma allvarsgrad som
   Storage-hålet hade. Inte påbörjat.
2. ~~De 36 gamla fotona i `data/photos.json`/`img/`~~ — **löst 26/10**, se
   ovan.
3. **`analysera`-funktionens bristande behörighetskontroll per bibliotek** —
   identifierad 17/10, inte åtgärdad.
4. **PR #28** (ta bort den övergivna CI-automationen) — öppnad, status för
   merge inte bekräftad på nytt efter att den byggdes.
5. **PR 6** — tomt läge för ny användare: bibliotek skapas automatiskt vid
   signup (redan klart sedan PR5a), guide för första plats/foto, möjlighet
   att namnge biblioteket. Nästa i kön.
6. **`shelves`-tabellen (Fas 2.4) har 0 rader i produktion** trots att
   kommentarer i koden antyder att den skulle fyllas — verkar vara ett dött
   spår, inte undersökt vidare.
7. **Sex extra, tomma "Mitt bibliotek"** upptäcktes i produktionsdatabasen
   under PR 4.5-arbetet (20/10) — troligen Claudes egna testinloggningar via
   den automatiska `signInAnonymously`-sessionen. Ofarligt, inte undersökt
   vidare.

**Klart sedan 17/10** (för historiken): bildlagringens kodsida och
bucket-sekretess (PR #32, #36, direktändring 19/10), DEFAULT_BC-fixen
(PR #36), den trasiga auto-migrate-CI:n borttagen och ersatt med direkta
migreringar via Claude (PR #35), Storage-bucketens bibliotekskoppling
(PR #39, 20/10), skapa konto + glömt lösenord (PR #41, 20/10) med Resend
som e-posttjänst och rätt Redirect URL i Supabase (21/10).

---

## Design-flödet vs. byggt läge

*Tillagd 24/10. Facit för varje skärm är
`Cointelligence Design System 261022/design_handoff_min_bokhylla/README.md`
(projektdokument) — citat därifrån i "Design säger"-kolumnen, inte min
tolkning av `flow.html`-koden. Stäm alltid av här innan en skärm märks klar;
se processen i stycket efter tabellen.*

### Nyanvändarflödet (`flow.html`, steg 1–6)

| # | Skärm | Design säger | Byggt läge |
|---|---|---|---|
| 1 | Välkommen | Fullskärms hyllfoto (mörkt), serif-rubrik "Hitta, Dela, Värdera dina böcker", knapp "Kom igång" | **Byggd** (PR #56) — `#homeEmptyGuide`, återanvänder `.eg-hero`/`.eg-scrim` |
| 2 | Kamera | Mörk sökare, "Vardagsrummet · hylla N", miniatyrer av tagna hyllor, räknare "N hyllor" | **Byggd** (PR #57/#58) — `#nsCam`-steget i wizarden |
| 3 | Analys | Bokryggarna tänds en i taget medan en räknare räknar upp till antal hittade böcker; bakgrunden tonar från mörkt mot ljust papper | **Byggd (PR #61).** `nsRunAnalysisBatch()` — samma ryggbredder/färger/scaleY-reveal som `flow.html`, monoton progressbar |
| 4 | Platsen (hos oss: Hylla) | Toppen öppnar mörk, bleknar till papper i översta tredjedelen. Platsens namn, antal hyllor/böcker, hyllplan staplade med foto+namn+antal, "Lägg till en hylla". Tre åtgärdslänkar (Sök/Värdera/Dela). CTA "Spara platsen" | **Byggd (PR #62).** `nsShowHylla()` — begreppet "Plats" heter hos oss "Hylla" (se begreppskommentaren i `flow.html`); Sök/Värdera/Dela visas gråade (avsteg, sidorna är inte byggda än) |
| 5 | Konto | E-post + Apple/Google/BankID, smal remsa av hyllfotot överst | **Delvis.** Inloggning/skapa-konto finns (`view-login`, e-post+lösenord), men inte i detta designade utförande och inte på rätt plats i flödet |
| 6 | Sparad plats (hos oss: Sparad hylla) | Som 4 men helt ljus, bekräftelse "Platsen är sparad", bottenmeny synlig | **Byggd (PR #62).** `nsShowHylla()` samma funktion, `saved`-läge. Bottenmenyn (Delade/Sälj) saknas fortfarande här — den finns bara i huvudappens vanliga vyer |
| — | Återvändande | Rubrik = Platsens namn+antal. Stort sökfält (58px, tealram) + snabbfilter-chips överst. Hyllplan staplade. CTA "Sälj N böcker". Bottenmeny. (Värdera/Dela nås via bottenmenyn, inte som knappar här) | **Inte byggd.** `renderPlace()`/`view-place` finns men följer inte detta utseende |

### Övriga sidor (`screens-ovriga.html`) — inte del av onboarding, egen spec

| Skärm | Design säger | Byggt läge |
|---|---|---|
| Sök i hyllan | Autofokuserat sökfält, filterchips (Alla/Till salu/Het/Kurslitteratur), träfflista med plats+hylla, medelvärde, temperaturbadge | **Inte byggd.** Ingen sökvy i `index.html` |
| Bokdetalj | Flikar värde/fakta/historik, knappar "Sälj boken"/"Ändra" | **Inte byggd** i detta utförande |
| Värdering | Grönt totalkort, summa per sajt, böcker sorterbara på värde/temp/titel, CTA "Sälj de 3 hetaste" | **Inte byggd.** `view-salj` är bara en tom rubrik-platshållare |
| Dela platsen | Hyllfoto, tre synlighetsnivåer, växel "Visa värdering", kopierbar länk | **Inte byggd.** `view-delade` existerar men inte detta utförande |

### Process för att undvika glapp framöver

Innan en skärm markeras klar:
1. Citera den exakta styckena ur `design_handoff_min_bokhylla/README.md` för
   just den skärmen (tabellen ovan) i PR-beskrivningen eller i chatten — inte
   en fri tolkning av `flow.html`.
2. Jämför skärmdump/produktion mot citatet explicit, punkt för punkt.
3. Thomas bekräftar matchen innan jobbet räknas som avslutat.
4. Uppdatera raden i den här tabellen till "Byggd (PR #N)" i samma PR.

---

*Sammanställd ur koden i `tringenr/bokhyllan` (grepp över `js/app.js`, samtliga
filer i `supabase/migrations/`, och `supabase/functions/analysera/index.ts`)
samt produktionsdatabasen `zuesxdqifsnvhleiukum`, uppdaterad 21 oktober 2026.*
