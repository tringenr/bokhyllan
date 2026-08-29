# Uppdrag för Claude Code: Bokhyllan — grundfix, ägarmodell och tre pelare

Klistra in det här som första meddelande i en ny Code-session för
`tringenr/bokhyllan`. Läs `docs/KARTA.md` i repot först — den beskriver
nuläget i detalj (arkitektur, alla nio glapp) och är facit för allt nedan.

## Kontext i korthet

Appen har två datakällor som inte är i synk: 737 böcker i en statisk
`data/books.json` (bara ändringsbar via commit) och 19 nyare böcker i
Supabase-databasen (ändringsbara via appen). De slås ihop först i
webbläsarens minne. Läsrättigheter (RLS) kräver idag felaktigt inloggning
även för läsning. Inget dubblettskydd finns. En fysisk plats kan bara ha en
hyllkod/ett foto, men vissa platser har flera fysiska högar. Avläsningens
edge function deployas separat från appens publiceringsflöde, vilket en gång
redan orsakat ett trasigt UI. Bokinfo (beskrivning) skrevs en gång statiskt
ur AI:ns egen kunskap, inte verifierad mot någon källa.

Arbetet görs i faser, i den ordning som listas nedan — varje fas är en
förutsättning för nästa, gör inte hopp. Efter varje fas: verifiera enligt
kriterierna, visa mig resultatet, vänta på klartecken innan nästa fas.

## Beslut som redan är tagna (bygg enligt dessa, fråga inte om dem igen)

1. **Öppen titel-vy, alltid, oavsett ägare/delning.** Titel, författare och
   kategori för ALLA böcker ska alltid vara läsbara utan inloggning — det
   här gäller ovanpå/oberoende av ägarmodellen nedan. Lånestatus och exakt
   hyllplats kräver alltid antingen inloggning som ägare, eller en giltig
   delning (se ägarmodellen). Denna regel får aldrig tystas av en
   delningsinställning på en enskild hylla.
2. **Ägarmodell:** varje hylla har en ägare (ett konto), satt automatiskt
   till skaparen vid skapande (`owner_id` är alltid satt, aldrig NULL).
   Delning sker per hylla, per mottagare, på två nivåer: **admin** (kan
   ändra/flytta/ta bort böcker) eller **read-only**. Ingen global
   standardnivå — ägaren väljer per mottagare. Ny hylla skapas utan delning
   förvald (bara ägaren har åtkomst från start); ägaren lägger till delningar
   efteråt via hyllans inställningar.
3. **Barn får egna konton** och äger sina egna hyllor. En hyllas
   delningsstatus visas alltid tydligt i UI (badge: "din hylla" / "delad till
   dig — admin" / "delad till dig — read-only"), med en lättåtkomlig "sluta
   dela"-knapp på delade hyllor.
4. **Extern delning** (till någon utan konto) sker separat via engångslänkar:
   ny länk varje gång du delar, kan stängas av senare, märks med en valfri
   egen notering (t.ex. "länk till Anna"). En egen yta ("mina delningar")
   listar dina aktiva interna delningar (till familjekonton) och externa
   länkar separat.
5. **Säljmatchning:** en knapp jag trycker på begäran (ingen schemalagd
   bevakning). Matchar mot valda sajter — Studentapan förvalt, fler kan
   väljas via kryssval eller egen fritext-URL/namn. Nya kandidater läggs till
   automatiskt och redovisas efteråt. Borttag från säljlistan sker alltid via
   en manuell knapp per rad — oavsett om raden kom dit automatiskt eller ej.
   Om appen själv föreslår en borttagning krävs mitt godkännande via knapp,
   inget tas bort tyst.
6. **Avyttrade böcker** hamnar i en egen yta under Inställningar. Där, och
   bara där, kan de raderas permanent — med en säkerhetsfråga (Är du säker?
   Ja/Nej) innan radering.
7. **Automatisk infohämtning:** när en bok läggs till eller ändras, försök
   hämta en riktig beskrivning från Google Books eller Open Library API
   automatiskt (ingen knapp krävs). Hittas ingen träff, behåll/skapa en
   AI-genererad beskrivning märkt tydligt overifierad (`source`/`uncertain`
   -fälten finns redan). Hittas ingen träff alls (varken extern källa eller
   AI-text) — spara ett tomt fält med `source: 'none'`, aldrig ett tyst fel.
   Detta ersätter INTE den befintliga live-hämtningen av bokomslag från Open
   Library (den fortsätter fungera som idag) — funktionen skriver bara
   beskrivning/källa/recensionslänkar.

## Genomgående säkerhetsregler (gäller alla faser med databasändringar)

- **Ta en full backup/snapshot av produktionsdatabasen omedelbart innan varje
  produktionskörning** i Fas 2 och Fas 3 — oavsett att en dry run redan gått
  bra mot en testkopia.
- **Stoppregel vid verifiering:** noll avvikelser tillåtna i stickprov.
  Hittas en enda avvikelse — stoppa, rapportera till mig, invänta klartecken
  innan du fortsätter till nästa delsteg.
- **RLS-policies testas explicit, aldrig bara via UI.** För varje ny
  policy: testa med minst tre roller (utloggad, ägare, mottagare med
  read-only) genom att anropa databasens API direkt (t.ex. curl eller
  Supabase-klienten utan session/med fel session) — inte bara att UI:t
  råkar dölja rätt saker.
- **Pusha inte flera gånger i snabb följd.** Vänta på grön bock i Actions
  mellan varje push.
- **Kör alltid starttestet** (`test/starttest.js`) före varje push.
- **Versionsstämpla** (`?v=…` i index.html, `const DV` i app.js) vid varje
  ändring av css/js/data.
- **Radering är alltid explicit och bekräftad.** Varje steg som tar bort data
  permanent (avyttrade böcker, ett barnkonto, en delning) kräver en
  säkerhetsfråga i UI och en tydlig regel för vad som händer med kvarvarande
  kopplingar (se Fas 2.5, punkt om kontoradering).
- Om du är osäker på om något är oåterkalleligt — fråga mig innan du gör det,
  gissa inte.

---

## Fas 0 — Riskreducering (gör detta först, litet och snabbt)

**0a. Dubblettskydd**
- Unik regel i databasen mot att exakt samma bok (titel+författare på samma
  hyllkod, eller likvärdig robust nyckel) sparas två gånger i `manual_books`.
- Granskningsvyn efter en avläsning: markera kända böcker, förvalt bortvalda
  innan sparning.
- Notera i UI/commit att detta bara gäller böcker redan i databasen — de 737
  i filen är oskyddade till Fas 2 är klar.
- **Acceptanskriterium:** fota om en redan katalogiserad databashylla →
  granskningsvyn visar den som redan tillagd, förvalt avbockad.

**0b. Deploy-ordning**
- Dokumenterad regel: edge function deployas ALDRIG före att motsvarande
  appändring är mergad och publicerad. Ändras svarsformatet, deploya
  funktionen efter appen — eller svara i båda formaten under en övergång.
- **Acceptanskriterium:** regeln finns nedskriven där du (Code) läser den
  automatiskt i framtida sessioner.

---

## Fas 1 — Läsrättigheter (fältnivå, gäller alla böcker oavsett ägare)

- Öppna läsning så titel/författare/kategori syns för alla, inloggad eller
  inte — enligt beslut 1 ovan, och detta ska fortsätta gälla oförändrat även
  efter att ägarmodellen (Fas 2.5) är på plats.
- Bygg en databasvy eller RPC-funktion som filtrerar bort lånestatus och
  hyllplats-fält för anrop utan giltig åtkomst (varken ägare eller delad
  mottagare).
- Skrivning kräver fortsatt inloggning i alla lägen.
- **Acceptanskriterium 1:** utloggad ser hela katalogens titlar/kategorier,
  aldrig en tom eller halv vy.
- **Acceptanskriterium 2 (testa explicit, inte bara via UI):** som utloggad,
  anropa databasens API/RPC direkt och bekräfta att lånestatus/hyllplats INTE
  finns i svaret.

---

## Fas 2 — Migrera böckerna in i databasen (störst insats — delsteg, en i taget)

Innan du börjar: bekräfta med mig att en backup/snapshot av databasen är
tagen.

**2.1 Dry run** mot en testkopia/gren av databasen, aldrig direkt mot
produktion.

**2.2 Delsteg (a) — Grunddata + ägarkolumn**
- Flytta titel/författare/kategori/beskrivning för alla 737 böcker i
  `books.json` in i databasen.
- Ge varje bok ett stabilt id (UUID/primärnyckel) för första gången.
- **Lägg till `owner_id`-kolumnen redan här, inte i en senare fas** — sätt
  den till ditt (Thomas) konto för alla migrerade böcker som förval. Detta
  förbereder Fas 2.5 utan en andra separat migrering senare.
- Kör mot produktion (efter backup). Verifiera: radantal stämmer (737+19=756
  rader totalt), inga tapp, inga oavsiktliga dubbletter. Stickprov: 20
  slumpade böcker jämförs manuellt. Testa sökningen mot både gamla och nya
  böcker.
- **Stoppregel gäller: en enda avvikelse → stoppa och rapportera.**

**2.3 Delsteg (b) — Hyllkoppling till befintlig modell**
- Koppla varje migrerad bok till sin nuvarande plats/hyllkod, oförändrad
  modell. Verifiera separat (samma stickprovsmetod).

**2.4 Delsteg (b2) — Multi-hög-modellen**
- Inför stöd för flera hyllkoder per fysisk plats (t.ex. sängen:
  `5:S1`–`5:S3`). Görs EFTER att (b) är verifierat klart, inte samtidigt.

**2.5 Delsteg (c) — Luckreferenser**
- Koppla om de 51 befintliga `gap_status`-posterna till de nya bok-id:na.

**2.6 Arkivera books.json**
- Sök igenom hela kodbasen (appen och edge function) och bekräfta att ingen
  kodväg längre läser `data/books.json` vid körning. Lista vad du
  kontrollerat.
- Flytta filen till en tydligt märkt arkivmapp (t.ex.
  `archive/books-2026-08-migrated.json`) med en kommentar om att den inte
  längre är sanningskälla.

---

## Fas 2.5 — Ägarmodell och delning

Denna fas är stor — dela i exakt dessa fem delsteg, var för sig, med eget
commit och egen verifiering innan nästa påbörjas.

**2.5.1 Schema**
- `owner_id` finns redan på böcker/hyllor sedan Fas 2.2. Säkerställ att den
  är `NOT NULL` och sätts automatiskt till `auth.uid()` vid varje ny
  hylla/bok som skapas framöver (aldrig manuellt ifylld, aldrig tillfälligt
  NULL).

**2.5.2 Delningstabell och policies**
- Skapa en `shelf_shares`-tabell: hylla, mottagarkonto, nivå (admin/
  read-only), skapad-datum.
- RLS-policies på hyllor/böcker som joinar mot `shelf_shares`: en mottagare
  ser/redigerar bara det som delats till dem, på rätt nivå.
- **Testa explicit** med minst tre roller (ägare, admin-mottagare,
  read-only-mottagare, samt en fjärde: ett konto UTAN delning — ska inte se
  någon annans privata hylla, bara den öppna titel-vyn från Fas 1).

**2.5.3 Barnkonton**
- Skapa kontostruktur för barn i familjeinloggningen: eget konto, äger sina
  egna hyllor.
- Definiera vad som händer om ett barnkonto tas bort: hyllorna raderas INTE
  automatiskt — de blir "föräldralösa" och synliga i en admin-vy där en
  förälder kan ta över ägarskapet eller radera hyllan medvetet (med
  säkerhetsfråga). Aldrig tyst radering av ett barns böcker.

**2.5.4 Delnings-UI**
- Badge på varje hylla: "din hylla" / "delad till dig — admin" / "delad till
  dig — read-only".
- "Sluta dela"-knapp lättillgänglig på hyllor du delat ut.
- Delningsformulär: välj mottagare (familjekonto) + nivå (admin/read-only)
  per delning, inget globalt förval.

**2.5.5 "Mina delningar"-vy**
- Egen yta som listar: dina aktiva interna delningar (till familjekonton,
  med nivå), och dina aktiva externa engångslänkar (med din egen notering,
  om du satt en), separat från varandra.

---

## Fas 3 — De tre halvbyggda funktionerna (var för sig, i denna ordning)

**3a. Uppdatera hylla**
- Hyllvyn visar senaste foto ur databasen när ett sådant finns, istället för
  den gamla bilden i repo-filen.
- Avläsningens edge function svarar med tre listor — nya, försvunna,
  oförändrade — genom att jämföra mot befintliga bok-id:n för platsen.
- Granskningsvyn visar **gammalt och nytt hyllfoto sida vid sida** (staplat
  på mobil), så skillnaden syns visuellt, inte bara i listform.
- Nya böcker läggs till direkt vid godkännande.
- Försvunna böcker: du godkänner varje en manuellt (aldrig automatiskt), och
  väljer i samma steg status — **"flyter runt"** eller det nya
  **"avyttrad"** — med en säkerhetsfråga (Är du säker? Ja/Nej) innan det
  verkställs.
- **Acceptanskriterium:** fota om en hylla där en bok bytts ut → appen visar
  korrekt vad som är nytt/försvunnet med båda bilderna synliga, och inget
  ändras i katalogen utan min bekräftelse.

**3b. Dela**
- Delningslänk (extern, engångslänk enligt beslut 4) till hela metahyllan
  eller en vald hylla — read-only browse-vy byggd på samma
  öppen-titel-vy-mekanism som Fas 1, plus möjlighet att kommentera/fråga om
  en specifik bok.
- Lånestatus och exakt plats visas aldrig i den delade vyn.
- **Acceptanskriterium:** öppna en delningslänk i en privat/inkognito-flik →
  ser titlar/kategorier för rätt avgränsning, ser INTE lånestatus/plats, kan
  lämna en kommentar på en bok.

**3c. Sälj**
- Knapp enligt beslut 5 ovan: matchar mot valda sajter, uppdaterar
  säljlistan, redovisar nytillkomna, kräver godkännande för borttag som
  appen själv föreslår, manuell "ta bort"-knapp på varje rad oavsett
  ursprung.
- **Acceptanskriterium:** tryck på knappen → säljlistan uppdateras och visar
  vad som lades till; en rad kan alltid tas bort manuellt oavsett hur den
  kom dit.

---

## Fas 4 — Städa resten

- **Sök:** verifiera explicit att sökningen fungerar lika bra på de 737
  nymigrerade böckerna som på de ursprungliga 19.
- **Luckor/svårlästa böcker:** samlad att-göra-vy med tre alternativ per
  lucka — ny bild, manuell inskrivning, "struntar i den". En lucka försvinner
  ALDRIG automatiskt — bara när du klarmarkerar efter granskning. När löst:
  spara ett datum, och markera de böcker som blev synliga/lösta med en annan
  färg i vyn.
- **Källmärkning:** visa i infokorten om en beskrivning är overifierad
  (`source`/`uncertain`-fälten).
- **Avyttrade böcker:** egen yta under Inställningar, permanent radering
  därifrån med säkerhetsfråga (enligt beslut 6).
- **Fota klart:** sängen (nu med `5:S1`–`5:S3`) och arbetsrummet, sist av
  allt, efter att modellen är klar.

---

## Fas 5 — Automatisk infohämtning (kan köras parallellt med Fas 3–4 efter Fas 2)

- Bygg funktionen enligt beslut 7: körs automatiskt vid ny/ändrad bok, ingen
  knapp. Källprioritet Google Books/Open Library → befintlig AI-text märkt
  overifierad → tomt fält med `source: 'none'`.
- Ersätter inte den befintliga live-hämtningen av omslag — skriver bara
  beskrivning/källa/recensionslänkar.
- **Retroaktiv körning för de 756 befintliga böckerna:** kör som ett
  fristående, pausat batch-jobb (t.ex. 50 böcker per omgång med paus mellan
  varje omgång) — INTE som ett enda anrop mot en edge function, för att
  undvika timeout och rate-limiting mot externa API:er.
- **Acceptanskriterium:** lägg till en ny bok manuellt → beskrivning/källa
  dyker upp automatiskt inom rimlig tid utan att jag trycker på något.

---

## Arbetssätt

- En fas/delsteg i taget. Visa mig resultatet och vänta på klartecken innan
  du går vidare — särskilt innan Fas 2:s produktionskörningar och innan
  varje delsteg i Fas 2.5.
- Om du under arbetet upptäcker att något kräver ett beslut som inte täcks
  ovan — fråga mig, gissa inte.
- Vid varje avslutad fas/delsteg: en kort sammanfattning av vad som ändrats,
  vad som verifierats, och eventuella kvarstående risker.
