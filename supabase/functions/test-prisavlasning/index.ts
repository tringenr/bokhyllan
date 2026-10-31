// TILLFÄLLIG MÄTFUNKTION — ska tas bort när frågan är besvarad (31/10 2026).
//
// Frågan: går priset på en Studentapan-sida att läsa av UTAN webbläsare?
// `prissok` läser idag bara priset ur sökträffens titel
// (extractPriceFromTitle). Campusbokhandeln skriver priset i titeln, 11 av 11
// rader har pris. Studentapan gör inte det: 8 av 8 rader har en länk men
// inget pris, och det är hela "Kolla själv"-kategorin i appen.
//
// Testprocessen från 29/10 (claude/rapport-tavily-chrome-pristest-2026-10-29.md)
// löste det med Claude in Chrome, steg 4 — en interaktiv session. En
// edge-funktion kan inte köra en webbläsare, så den vägen går inte att bygga.
// Den här funktionen provar de två vägar som INTE kräver webbläsare:
//
//   A) rak fetch av sidan, och sökning efter prismönster i HTML-koden
//   B) Tavilys /extract, som hämtar och renderar sidan åt oss
//
// Funktionen SKRIVER INGENTING i databasen. Den rapporterar vad som finns på
// sidorna, inklusive ALLA tal den hittar - inte bara det den tror är rätt
// pris. Lärdom 5 i rapporten: nypris får aldrig sparas som begagnatpris, och
// det går inte att avgöra vilket som är vilket innan vi sett vad sidan
// faktiskt innehåller.

const TAVILY_KEY = Deno.env.get("TAVILY_API_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

/* Alla tal som ser ut som ett pris, med lite text runt omkring så att vi kan
   se SAMMANHANGET - "Ditt pris", "nypris", "frakt" är helt olika saker. */
function prisTraffar(text: string) {
  const ut: { tal: number; sammanhang: string }[] = [];
  const re = /(\d[\d\s ]{0,6})\s*(?:kr|:-|SEK)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null && ut.length < 40) {
    const tal = Number(m[1].replace(/[\s ]/g, ""));
    if (!isFinite(tal) || tal <= 0 || tal > 20000) continue;
    const fran = Math.max(0, m.index - 60);
    ut.push({
      tal,
      sammanhang: text.slice(fran, Math.min(text.length, m.index + m[0].length + 30))
        .replace(/\s+/g, " ").trim(),
    });
  }
  return ut;
}

/* Gör HTML till läsbar text innan vi letar tal: ett pris som ligger inuti ett
   attribut eller ett script ska inte räknas som synligt på sidan. */
function htmlTillText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
}

async function vagA(url: string) {
  try {
    const r = await fetch(url, {
      headers: {
        // Utan en vanlig webbläsarsignatur svarar många sajter med en
        // felsida, vilket skulle se ut som "inget pris" i mätningen.
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
        "Accept-Language": "sv-SE,sv;q=0.9",
      },
      redirect: "follow",
    });
    const html = await r.text();
    const text = htmlTillText(html);
    return {
      status: r.status,
      bytes: html.length,
      text_langd: text.length,
      /* Om sidan är ett tomt JS-skal syns det här: mycket HTML, lite text. */
      ser_ut_som_js_skal: text.length < 1200 && html.length > 20000,
      traffar: prisTraffar(text),
    };
  } catch (e) {
    return { fel: String(e) };
  }
}

async function vagB(url: string) {
  if (!TAVILY_KEY) return { fel: "TAVILY_API_KEY saknas i funktionens miljö" };
  try {
    const r = await fetch("https://api.tavily.com/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${TAVILY_KEY}` },
      body: JSON.stringify({ urls: [url] }),
    });
    const data = await r.json();
    if (!r.ok) return { status: r.status, svar: data };
    const innehall: string =
      data?.results?.[0]?.raw_content ?? data?.results?.[0]?.content ?? "";
    return {
      status: r.status,
      misslyckade: data?.failed_results ?? [],
      text_langd: innehall.length,
      traffar: prisTraffar(innehall),
    };
  } catch (e) {
    return { fel: String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  let body: { urls?: string[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Skicka { urls: [...] }" }, 400);
  }
  const urls = (body.urls || []).slice(0, 10);
  if (!urls.length) return json({ error: "Inga urls angivna" }, 400);

  const ut = [];
  for (const url of urls) {
    const [a, b] = await Promise.all([vagA(url), vagB(url)]);
    ut.push({ url, A_rak_fetch: a, B_tavily_extract: b });
  }
  return json({ antal: ut.length, resultat: ut });
});
