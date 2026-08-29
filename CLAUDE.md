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

Versionsstämpla vid varje ändring av css/js/data: `?v=<tidsstämpel>` i
`index.html` och `const DV` i `js/app.js`. Utan det sitter användaren kvar i
webbläsarens cache.

Pusha inte flera gånger i snabb följd — GitHub Pages avbryter pågående
publiceringar. Vänta på grön bock i Actions mellan varje push.

## Migreringar

Varje migrering som körs mot produktionsdatabasen ska finnas som en `.sql`-fil
under `supabase/migrations/` med samma versionsnummer som raden i
`supabase_migrations.schema_migrations`. Körs den via MCP eller dashboarden
registreras versionen automatiskt — döp då om den lokala filen så numren
matchar, annars körs den om vid nästa deploy.

## Branchdisciplin

Aldrig commit direkt till `main`. En gren per spår, skapad från färsk
`origin/main`. Pusha efter första commit och öppna PR. Merga aldrig utan
Thomas uttryckliga klartecken.

## Databasen

Projekt `zuesxdqifsnvhleiukum`. RLS är på för alla tabeller.

`manual_books` har sedan 2026-08-27 en unik regel på titel + författare +
hyllkod, normaliserad på gemener och trimmad text. **Den skyddar bara rader i
databasen** — de 737 böckerna i `data/books.json` ligger utanför och är
oskyddade tills migreringen i Fas 2 är klar.
