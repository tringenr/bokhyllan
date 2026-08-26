# Överlämningsprompt — Bokhyllan

*Klistra in allt nedanför linjen i en ny tråd.*

---

Jag jobbar vidare på **Bokhyllan** — en katalog över hemmets böcker som vi byggt som webbapp. Här är allt du behöver veta.

## Var saker finns

- **Live:** https://tringenr.github.io/bokhyllan (GitHub Pages)
- **Repo:** https://github.com/tringenr/bokhyllan — arbeta i en klon under `/tmp`, pusha med token (fråga mig om den)
- **Databas:** Supabase MCP, project_id `zuesxdqifsnvhleiukum`
- **Schemalagd bevakning:** `bokhyllan-luckor` (08/13/19 dagligen) läser av uppladdade luckfoton

## Vad appen är

737 böcker på 8 platser, katalogiserade genom att du läst av bokryggarna på foton av hyllorna. Statisk sida (`index.html`, `css/style.css`, `js/app.js`, `data/*.json`, `img/`), ingen byggkedja. Supabase sköter delad status, familjeinloggning och allt användaren ändrar.

**Tre flikar i bottennav (iPhone-först):** 🔍 Sök (hyllor, sökfält, snabbknappar, infälld boklista), 💰 Sälj (säljförslag mot Studentapan), ⚙️ Inställningar (hyllnamn, nya hyllfoton, kategorier, luckor).

**Hyllkoder:** `bokhylla:sektion+plan`, t.ex. `1:V3`. Plan räknas nedifrån. `V`/`H` = sektion, `S` = enkel hylla, `K` = köket. Platser: 1 = Bokhylla 1 vardagsrummet, 2 = Bokhylla 2, 3 = Bokskåpet, 4 = Köket, 5 = Sovrummet vid sängen, 6 = Sovrummet gröna skåpet, 7 = Sovrummet fönsterbrädan, 8 = Soffan.

**Supabase-tabeller:** `book_status`, `bc_names`, `gap_status`, `manual_books`, `cat_renames`, `book_cat`, `book_cover`, `new_shelves`. Alla kan läsa, bara inloggade skriver.

## Arbetssätt som fungerat

- **Kör alltid ett starttest före push.** Syntaxkontroll räcker inte — en raderad funktion slog en gång ut hela appen utan syntaxfel. Testet kör `js/app.js` i en simulerad DOM med stubbad Supabase och fångar sådant.
- **Versionsstämpla vid varje ändring.** `?v=<tidsstämpel>` på css/js/data i `index.html` och `const DV` i `app.js` — annars sitter användaren fast i cachen.
- **Pusha inte flera gånger i snabb följd.** GitHub Pages avbryter pågående publiceringar; vänta på grön bock i Actions.
- **Sandlådan når inte Supabase bildlagring.** Uppladdade foton läses via base64-kopian i `gap_status.photo_data`.
- **Batchstorlek för prisverifiering:** 10–12 titlar.

## Kvar att göra

**Sälj (närmast till hands):** prisverifiera ~35 kandidater mot Studentapan i batchar om 10–12, uppdatera `data/sell.json`. Sedan sätta upp veckobevakning. Kanalslutsats: kurslitteratur → Studentapan (200–450 kr), Tradera bara för det Studentapan inte tar (30–50 kr för kursböcker), Blocket olämpligt.

**Katalog:** 4 luckor kvar som behöver närbilder. Arbetsrummet och barnens rum är ofotade. Kökets nedersta hylla saknas.

**Funktioner:** automatisk diff vid hylluppdatering; exakta bokmarkeringar per bokrygg; kvalitetssäkra de 490 beskrivningarna mot Google Books (de är skrivna ur din bokkunskap och kan innehålla fel — appen märker dem som sådana).

## Om mig som samarbetspartner

Jag testar allt i mobilen och säger till när något skaver. Fråga hellre en gång för mycket än bygg fel sak. Var rak med begränsningar — jag vill veta när något inte går, inte få en halvmesyr. Och kolla att det faktiskt fungerar innan du säger att det är klart.
