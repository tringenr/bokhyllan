// Permanent prissökning mot Studentapan, Bokbörsen och Tradera, via Tavily.
// Ersätter testfunktionen test-tavily-pricesearch.
//
// Metod och lärdomar landade i claude/rapport-tavily-chrome-pristest-2026-10-29.md
// och claude/sparningsark-tavily-pristest-2026-10-29.md. Fält bekräftade med
// Thomas och Design 29/10 (migrering 20261029163152_prissok_falt_och_historik.sql).
//
// Anropas med POST { book_ids: number[], confirm_overwrite?: boolean } och den
// inloggade användarens JWT i Authorization-headern, precis som hyllplan och
// analysera - RLS avgör vad som får läsas/skrivas, ingen service-roll används.
// Högst 25 book_ids per anrop (appen kör flera anrop i omgångar, osynligt för
// användaren).
//
// Statusar som sparas (price_status/sell_price_sources.status) - visningsnamn
// i appen (satt av Design) inom parentes:
//   automatiskt  (Okontrollerat) - stark titelmatchning OCH pris i sidtiteln
//   vantar       (Väntar på kontroll) - trolig sida men osäker titel eller
//                pris inte läsbart i träffen
//   osakert      (Varierande pris) - en ny sökning gav ett annat pris för
//                samma sajt än den förra sökningen gav - se LÄRDOM 3 nedan
//   ingen_traff  (Inget hittat) - ingen trolig träff alls
//   bekraftat    (Kontrollerat) - sätts ALDRIG av den här funktionen, bara av
//                en människa (Chrome-steget) eller den gamla Campus-rundan.
//
// "automatiskt" skrivs ALDRIG över "bekraftat" utan att confirm_overwrite är
// satt - se bekräftelsedialogen i appen. Det som skrivs över flyttas först
// till sell_price_history, aldrig raderat.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY");

const TARGET_SITES = ["studentapan.se", "bokborsen.se", "tradera.com"];
const MAX_BOOKS_PER_CALL = 25;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// ---- Textjämförelse -----------------------------------------------------
// LÄRDOM 1 (rapporten): lita aldrig på Tavilys textutdrag, bara sökträffens
// EGEN sidtitel - utdraget kan komma från en helt annan boks sida.
// LÄRDOM 2: även titelfiltret ger falska positiva vid delvis ordöverlapp
// ("Andlig läsning" matchade en annan bok till 70%). "Stark" matchning
// kräver därför att hela boktiteln (minus en eventuell upplage-parentes)
// återfinns i sidtiteln - inte ett procenttal.

function normalize(s: string): string {
  return s.toLowerCase().replace(/["""'']/g, "").replace(/[():,.\-–—?!|]/g, " ").replace(/\s+/g, " ").trim();
}
// Stryker en avslutande upplage-/årsparentes, t.ex. "(uppl 2)", "(3:e uppl.)",
// "(2017)" - annars matchar nästan ingen katalogtitel någonsin, eftersom
// sidtitlar på säljsajter nästan aldrig skriver ut "(uppl 2)".
function coreTitle(title: string): string {
  return title.replace(/\s*\(\s*(uppl\.?\s*\d+|\d+\s*:?a?\s*uppl\.?|\d{4})\s*\)\s*$/i, "").trim();
}
function strongTitleMatch(hitTitle: string, bookTitle: string): boolean {
  const hit = normalize(hitTitle);
  const book = normalize(coreTitle(bookTitle));
  if (!book) return false;
  return hit.includes(book);
}
// "Trolig men inte säker" - minst halva de meningsbärande orden igen, så en
// uppenbart orelaterad sida på rätt domän inte visas som "väntar på kontroll".
function plausibleTitleMatch(hitTitle: string, bookTitle: string): boolean {
  const hit = normalize(hitTitle);
  const words = normalize(coreTitle(bookTitle)).split(" ").filter((w) => w.length > 2);
  if (!words.length) return false;
  return words.filter((w) => hit.includes(w)).length / words.length >= 0.5;
}
function extractPriceFromTitle(title: string): number | null {
  const m = title.match(/(\d[\d\s]{1,6})\s*(SEK|kr)\b/i);
  if (!m) return null;
  const n = parseInt(m[1].replace(/\s/g, ""), 10);
  return Number.isFinite(n) && n > 0 && n < 5000 ? n : null;
}
// Beslutat 29/10: bara begagnatpris räknas. Bokbörsen och Tradera är
// andrahandsmarknader per definition. Studentapan säljer både nytt och
// begagnat - utan att öppna sidan (det är Chrome-steget, görs separat
// manuellt) kan vi bara läsa av det sidtiteln/utdraget själva säger. Säger
// ingetdera "begagnad"/"begagnat" filtreras Studentapan-träffen INTE bort,
// men priset sparas som väntar på kontroll i stället för automatiskt -
// hellre en människa som kollar än ett nypris som smugglas in som begagnat.
function studentapanAnvandaSomBegagnat(hitTitle: string, snippet: string): boolean {
  return /begagnad|begagnat/i.test(hitTitle + " " + snippet);
}
function siteOf(url: string): string {
  if (url.includes("studentapan.se")) return "studentapan";
  if (url.includes("bokborsen.se")) return "bokborsen";
  if (url.includes("tradera.com")) return "tradera";
  return "";
}

type TavilyHit = { title?: string; url?: string; content?: string };
async function tavilySearch(title: string, author: string | null): Promise<TavilyHit[]> {
  const query = `${title}${author ? ` ${author}` : ""} begagnad bok köp`;
  const resp = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TAVILY_API_KEY}` },
    body: JSON.stringify({ query, search_depth: "basic", include_domains: TARGET_SITES, max_results: 5 }),
  });
  if (!resp.ok) throw new Error(`Tavily-fel ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  const data = await resp.json();
  return (data.results ?? []) as TavilyHit[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  if (!TAVILY_API_KEY) return json({ error: "TAVILY_API_KEY saknas som secret i projektet" }, 500);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Logga in för att söka priser." }, 401);
  const sb = createClient(SB_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await sb.auth.getUser();
  if (userErr || !userData?.user) return json({ error: "Ogiltig eller utgången session." }, 401);

  let body: { book_ids?: number[]; confirm_overwrite?: boolean };
  try { body = await req.json(); } catch { return json({ error: "Ogiltig JSON-body" }, 400); }
  const bookIds = Array.isArray(body.book_ids) ? body.book_ids.filter((n) => Number.isInteger(n)) : [];
  const confirmOverwrite = body.confirm_overwrite === true;
  if (!bookIds.length) return json({ error: "book_ids-listan är tom" }, 400);
  if (bookIds.length > MAX_BOOKS_PER_CALL) {
    return json({ error: `Högst ${MAX_BOOKS_PER_CALL} böcker per anrop.` }, 400);
  }

  // RLS filtrerar automatiskt bort böcker i andra bibliotek - de kommer inte
  // tillbaka här alls, utan att funktionen behöver kolla det själv.
  const { data: books, error: booksErr } = await sb
    .from("manual_books").select("id,title,author,library_id").in("id", bookIds);
  if (booksErr) return json({ error: "Kunde inte läsa böckerna: " + booksErr.message }, 500);

  const resultat: Record<string, unknown>[] = [];

  for (const book of books ?? []) {
    try {
      // Hämta eller skapa sell_items-raden - fyller bara i det som saknas,
      // rör aldrig andra fält (checked, heat, why, estimated_value, ...).
      let { data: item } = await sb.from("sell_items").select("*")
        .eq("library_id", book.library_id).eq("book_id", book.id).maybeSingle();
      if (!item) {
        const { data: created, error: insErr } = await sb.from("sell_items")
          .insert({ library_id: book.library_id, book_id: book.id, title: book.title })
          .select("*").single();
        if (insErr) { resultat.push({ book_id: book.id, error: insErr.message }); continue; }
        item = created;
      }

      const redanSokt = item.price_status === "bekraftat" || item.price_status === "automatiskt";
      if (redanSokt && !confirmOverwrite) {
        resultat.push({ book_id: book.id, status: "skippad_skyddad", price_status: item.price_status });
        continue;
      }

      const hits = await tavilySearch(book.title, book.author || null);
      const kandidater = hits
        .map((h) => ({ title: h.title ?? "", url: h.url ?? "", snippet: (h.content ?? "").slice(0, 200), site: siteOf(h.url ?? "") }))
        .filter((h) => h.site)
        .map((h) => ({ ...h, strong: strongTitleMatch(h.title, book.title), plausible: plausibleTitleMatch(h.title, book.title) }));

      const starka = kandidater.filter((h) => h.strong);
      const meddPris = starka
        .filter((h) => h.site === "bokborsen" || h.site === "tradera" || studentapanAnvandaSomBegagnat(h.title, h.snippet))
        .map((h) => ({ ...h, price: extractPriceFromTitle(h.title) }))
        .filter((h) => h.price !== null) as (typeof starka[number] & { price: number })[];

      let nyStatus: string;
      let nyLow: number | null = null, nyHigh: number | null = null;
      const kallRader: { site: string; price: number | null; url: string; page_title: string; status: string }[] = [];

      if (meddPris.length > 0) {
        nyStatus = "automatiskt";
        const priser = meddPris.map((h) => h.price);
        nyLow = Math.min(...priser); nyHigh = Math.max(...priser);
        for (const h of meddPris) kallRader.push({ site: h.site, price: h.price, url: h.url, page_title: h.title, status: "automatiskt" });
      } else if (starka.length > 0 || kandidater.some((h) => h.plausible)) {
        nyStatus = "vantar";
        const trolig = starka[0] || kandidater.find((h) => h.plausible);
        if (trolig) kallRader.push({ site: trolig.site, price: null, url: trolig.url, page_title: trolig.title, status: "vantar" });
      } else {
        nyStatus = "ingen_traff";
      }

      // LÄRDOM 3: skilj inte på "osäkert" genom att söka två gånger (kostar
      // dubbla krediter) - utan genom att jämföra med förra körningens
      // automatiska pris för samma sajt. Skiljer de sig har sökresultatet
      // visat sig variera över tid, precis det testet upptäckte.
      if (nyStatus === "automatiskt" && item.price_status === "automatiskt") {
        const { data: gamlaKallor } = await sb.from("sell_price_sources").select("site,price")
          .eq("sell_item_id", item.id).eq("status", "automatiskt");
        const gammaltSpann = (gamlaKallor || []).map((k: { price: number | null }) => k.price).filter((p: number | null): p is number => p != null);
        if (gammaltSpann.length && (Math.min(...gammaltSpann) !== nyLow || Math.max(...gammaltSpann) !== nyHigh)) {
          nyStatus = "osakert";
          nyLow = Math.min(nyLow!, ...gammaltSpann); nyHigh = Math.max(nyHigh!, ...gammaltSpann);
        }
      }

      // Skriv över: det gamla (om något) till historik - ALDRIG raderat -
      // sedan den nya raden. Rör bara om vi faktiskt har en ny sökning att
      // skriva (annars lämnas en skyddad rad helt orörd trots confirm_overwrite
      // när books_ids råkar sakna träff den här gången).
      if (redanSokt || item.price_status) {
        const { data: gamlaKallor } = await sb.from("sell_price_sources").select("*").eq("sell_item_id", item.id);
        for (const g of gamlaKallor || []) {
          await sb.from("sell_price_history").insert({
            sell_item_id: item.id, site: g.site, price: g.price, url: g.url,
            page_title: g.page_title, status: g.status || item.price_status || "automatiskt",
          });
        }
      }

      for (const k of kallRader) {
        await sb.from("sell_price_sources").upsert(
          { sell_item_id: item.id, site: k.site, price: k.price, url: k.url, page_title: k.page_title, status: k.status },
          { onConflict: "sell_item_id,site" },
        );
      }
      await sb.from("sell_items").update({
        price_status: nyStatus, price_low: nyLow, price_high: nyHigh, searched_at: new Date().toISOString(),
      }).eq("id", item.id);

      resultat.push({ book_id: book.id, status: nyStatus, low: nyLow, high: nyHigh });
    } catch (e) {
      resultat.push({ book_id: book.id, error: String(e) });
    }
  }

  return json({ resultat });
});
