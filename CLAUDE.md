# Bokhyllan — arbetsregler

Läs `docs/KARTA.md` först. Den beskriver arkitekturen, alla flöden och de nio
kända glappen, och är facit för allt arbete i det här repot.

## Deploy-ordning — appen först, funktionen sedan

**Edge-funktionen får aldrig deployas före att motsvarande appändring är mergad
och publicerad.**

Anledningen: funktionen deployas direkt till Supabase med
`supabase functions deploy` och bryr sig inte om PR:er, medan appen publiceras
via GitHub Pages när något mergas till `main`. Ändras båda samtidigt och
funktionen går först, svarar den i ett format som den publicerade appen inte
förstår. Det hände 2026-08-27: appen fick en boklista men kunde bara visa text,
och användaren såg en textklump där en granskningslista skulle ha stått.

Ordningen är alltså:

1. Ändra appen och funktionen på samma gren.
2. Merga och vänta på grön Actions-körning.
3. Deploya funktionen först därefter.

Måste funktionen ändras före appen — svara i **båda** formaten under
övergången, och ta bort det gamla formatet i en senare commit när appen är ute.

## Gates före varje push

    node test/starttest.js

Starttestet kör `js/app.js` i en simulerad DOM och fångar bland annat
onclick-handlers som pekar på funktioner som inte finns. Rapportera antalet
kontrollerade funktioner, inte bara att det blev grönt — en syntaxkontroll
räcker inte, en raderad funktion har en gång slagit ut hela appen utan
syntaxfel.

Versionsstämpla vid varje ändring av css/js/data:

    sh test/versionsstampla.sh

Skriptet sätter samma nummer på `?v=` och `var MY` i `index.html`, `const DV`
i `js/app.js` och `data/version.json`. Appen jämför `MY` med `version.json`
vid start och när den kommer tillbaka från bakgrunden, och laddar om sig
själv när de skiljer sig - det är så appen på iPhones hemskärm uppdateras.
Starttestet fäller en push där numren inte stämmer.

Pusha inte flera gånger i snabb följd — GitHub Pages avbryter pågående
publiceringar. Vänta på grön bock i Actions mellan varje push.

## Migreringar

Körs numera alltid direkt mot produktionsdatabasen via Supabase-kopplingen
(Claudes `mcp__Supabase__apply_migration`), inte via en automatisk
GitHub Actions-körning. Ett tidigare workflow (`supabase-migrate.yml`) skulle
köra `supabase db push` automatiskt vid push till `main`, men gick aldrig
grönt någon av sina 16 körningar — bytt lösenord på `SUPABASE_DB_URL` löste
inte heller det, och grundorsaken är okänd (loggen gick inte att läsa i
Claudes körningsmiljö). Togs bort 2026-10-19 istället för att jaga felet
vidare.

Varje migrering som körs mot produktionsdatabasen ska ändå finnas som en
`.sql`-fil under `supabase/migrations/` med samma versionsnummer som raden i
`supabase_migrations.schema_migrations` — annars stämmer inte repots
migrationshistorik med verkligheten. Körs den via MCP eller dashboarden
registreras versionen automatiskt — döp då om den lokala filen så numren
matchar.

## Plan- och självgranskningsregel

Gäller varje kodningsinsats, stor som liten.

**Innan kodning påbörjas:**
1. Lägg fram en plan för steget.
2. Granska den egna planen själv — leta efter fel, luckor eller problem.
3. Hittar du något: revidera planen och granska igen. Upprepa tills inget
   problem kvarstår, eller bara triviala kvarstår.
4. Meddela Thomas att granskningen är gjord. Börja inte koda förrän han har
   gett klartecken.

**När kodningen är klar:**
1. Granska det som faktiskt gjorts mot uppdraget för just det steget — stämmer
   resultatet mot det som var tänkt?
2. Om det finns en mismatch: stanna. Meddela Thomas och vänta på hans input
   innan något mer görs — gissa inte dig fram till en lösning på egen hand.

## Branchdisciplin

Aldrig commit direkt till `main`. En gren per spår, skapad från färsk
`origin/main`. Pusha efter första commit och öppna PR. Merga aldrig utan
Thomas uttryckliga klartecken.

## Databasen

Projekt `zuesxdqifsnvhleiukum`. RLS är på för alla tabeller.

`manual_books` har sedan 2026-08-27 en unik regel på titel + författare +
hyllkod, normaliserad på gemener och trimmad text.

Sedan Fas 2 (2026-09) bor **hela** katalogen i databasen: `manual_books` (böcker
+ beskrivningar), `gaps` (luckor), `shelves` (hyllregister), `spot_names` (lösa
platser). De gamla filerna `data/books.json`, `data/gaps.json` och
`data/bookinfo.json` är flyttade till `archive/` och läses inte av appen.
