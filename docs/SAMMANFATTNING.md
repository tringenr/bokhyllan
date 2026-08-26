# Bokhyllan — projektsammanfattning

*Uppdaterad 26 augusti 2026*

## Vad vi byggde

En sökbar katalog över hemmets bokhyllor, från idé till körande webbapp med databas — på en kväll.

**Live:** https://tringenr.github.io/bokhyllan
**Repo:** https://github.com/tringenr/bokhyllan
**Databas:** Supabase-projektet `bokhyllan` (`zuesxdqifsnvhleiukum`, Stockholm, gratisnivå)

## Katalogen i siffror

| | |
|---|---|
| Böcker | 737 |
| Platser (bokhyllor/rum) | 8 |
| Kategorier | 37 |
| Hyllfoton | 36 |
| Bokbeskrivningar | 490 |
| Luckor (olästa partier) | 51 granskade, 4 kvar |

**Platserna:** Bokhylla 1 – vardagsrummet (2 sektioner × 6 plan), Bokhylla 2 (2 × 6), Bokskåpet (4 hyllor), Köket (kokbokshyllan + löst i köket), Sovrummet – vid sängen, Sovrummet – gröna skåpet, Sovrummet – fönsterbrädan, Soffan.

**Hyllkoder:** `bokhylla:sektion+plan`, t.ex. `1:V3` = bokhylla 1, vänster sektion, plan 3. Plan räknas **nedifrån och upp**. `V`/`H` = vänster/höger sektion, `S` = enkel hylla, `K` = köket.

## Så gick arbetet till

1. **Katalogisering från foto.** Foton av hyllorna, beskurna per hyllplan; titlar och författare avlästa från bokryggarna, kategorier tilldelade. Partier som inte gick att läsa rödmarkerades.
2. **Prototyp som artifact** — sökbar dashboard med status per bok.
3. **Flytt till riktig app** när prototypen växt ur formatet: GitHub-repo + GitHub Pages, bilder som filer istället för inbäddade, Supabase för delad data.
4. **Mobilanpassning** — iPhone-först med bottennavigering.
5. **Luckgenomgång** — alla 51 rödmarkerade partier granskade; 47 lösta (mest falsklarm), 16 nya böcker hittade.
6. **Säljbevakning** — pilotstudie mot Studentapan.

## Appens funktioner

**🔍 Sök** — hero-knapp till hyllorna, sökfält, snabbknappar per kategori, infälld boklista med filter på plats/kategori/status. Klick på titel öppnar popup med beskrivning, omslag (live från Open Library) och kategoriväljare. "📍 sågs senast" visar boken markerad på hyllfotot.

**💰 Sälj** — säljförslag mot Studentapan med priser, hetta och plats i hemmet.

**⚙️ Inställningar** — hyllnamn, lägg till/uppdatera hylla via foto, kategoriredigering, luckvyn, app-info.

**Övrigt** — familjeinloggning (👤), delafunktion (🔗), helskärmsvisning med zoom och bläddring, status per bok (på plats / utlånad till vem / flyter runt) som synkas i realtid mellan enheter.

## Teknik

Statisk sida: `index.html` + `css/style.css` + `js/app.js`, data i `data/*.json`, bilder i `img/`. Ingen byggkedja. Versionsstämpling (`?v=…`) tvingar fram färska filer vid varje uppdatering.

**Supabase-tabeller:** `book_status` (status/utlåning, realtidssynk), `bc_names` (hyllnamn), `gap_status` (luckor + foton), `manual_books` (handinskrivna böcker), `cat_renames` + `book_cat` (kategoriändringar), `book_cover` (egna omslag), `new_shelves` (kö för nya hyllfoton). Radnivåsäkerhet: alla kan läsa, bara inloggade kan skriva.

**Konton** skapas i Supabase-panelen (Authentication → Users → Add user, med Auto Confirm). Registrering är avstängd.

## Automatisk luckbevakning

Schemalagd uppgift `bokhyllan-luckor` kör 08, 13 och 19 varje dag: kollar om nya luckfoton laddats upp, läser av dem, lägger in böckerna och skriver en notis i appen. Luckan stannar kvar tills Thomas kontrollerat och tryckt ✓ Klar. Kräver att skrivbordsappen är igång.

*Teknisk not:* sandlådan når inte Supabase bildlagring, därför sparar appen även en nedskalad kopia av varje foto som base64 direkt i databasen — det är den kopian bevakningen läser.

## Säljbevakning — läget

Verifierade priser (Studentapan, augusti 2026):

| Bok | Pris | Bedömning |
|---|---|---|
| Clinical Handbook of Psychological Disorders (Barlow) | begagnad **slut**, ny 1 491 kr | Hetast — efterfrågan utan utbud |
| Klinisk barnpsykologi | 439 kr | Het |
| Hur moderna organisationer fungerar | 359 kr (uppl 5) | Het |
| Utvecklingspsykologi (Havnesköld) | 205 kr | Het |
| Motiverande samtal (uppl 3) | 189 kr | Medel — uppl 4 pressar priset |
| Beteendets ABC | ny 489 kr | Medel — du har två exemplar |
| Dynamisk psykiatri | 30–50 kr (Tradera) | Lågt värde |

**Slutsats om kanaler:** kurslitteratur säljs på Studentapan (200–450 kr), Tradera ger 30–50 kr för samma böcker och är bara värt besväret för det Studentapan inte tar (Wilber-samlingen, Sandman-serien, mystikklassikerna). Blocket är inte lämpligt för systematisk bevakning. Terminsstart = högsäsong.

Uppskattningsvis 40–60 av samlingens böcker är säljbara. Cirka 35 kandidater återstår att prisverifiera, i batchar om 10–12.

## Kvar att göra

**Katalog**
- 4 luckor kvar (behöver närbilder): Bokhylla 1 V plan 6, Bokhylla 2 V plan 6 ("Linköping"), Bokhylla 2 V plan 2, Sovrummet vid sängen
- Arbetsrummet och barnens rum är inte fotade
- Kökets nedersta hylla saknas

**Sälj**
- Batch 2–4: prisverifiera ~35 kandidater
- Sätta upp veckobevakning som uppdaterar `data/sell.json` automatiskt

**Funktioner**
- Automatisk diff vid hylluppdatering (idag läser Claude av bilden manuellt)
- Exakta bokmarkeringar på hyllfotona (koordinater per bokrygg istället för ungefärlig zon)
- Kvalitetssäkra de 490 beskrivningarna mot Google Books/Open Library — de är skrivna ur Claudes bokkunskap och kan innehålla fel

## Lärdomar

- **Artifact-formatet har en nätverksspärr** som blockerar externa anrop. Flytten till GitHub Pages gjorde det möjligt att hämta bokomslag live.
- **Popup-dialoger (`prompt`) fungerar inte i artifacts** — inline-redigering krävdes.
- **Snabba pushar avbryter varandras publiceringar** i GitHub Pages. Vänta på grön bock i Actions.
- **Syntaxkontroll räcker inte** — en raderad funktion slog ut hela appen utan syntaxfel. Ett starttest som kör appen i simulerad webbläsare fångar den sortens fel.
